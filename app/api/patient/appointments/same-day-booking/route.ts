import { NextResponse } from "next/server";
import connectDB from "@/lib/db/connect";
import User from "@/lib/db/models/User";
import Appointment from "@/lib/db/models/Appointment";
import Balance from "@/lib/db/models/Balance";
import { authOptions } from "@/lib/auth/config";
import { getServerSession } from "next-auth";
import { v4 as uuidv4 } from 'uuid';
import Stripe from "stripe";
import stripe from "@/lib/stripe";
import { SAME_DAY_PRICING } from "@/lib/constants/plans";

const baseUrl = process.env.BASE_URL || 'https://app.icarewellbeing.com';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { 
      appointmentId, 
      newDate, 
      selectedSlot, 
      isReschedule, 
      sessionToBeReduced, 
      sessionIndex,
      useBalance = false 
    } = await req.json();
    
    if (!appointmentId && !selectedSlot) {
      return NextResponse.json(
        { error: "Appointment ID or selected slot is required" },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const totalPrice = SAME_DAY_PRICING.BASE_PRICE * SAME_DAY_PRICING.SURCHARGE_MULTIPLIER;
    const surcharge = totalPrice - SAME_DAY_PRICING.BASE_PRICE;
    
    console.log('Same-day booking API called:', {
      useBalance,
      isReschedule,
      appointmentId,
      totalPrice,
      surcharge,
      basePrice: SAME_DAY_PRICING.BASE_PRICE,
      surchargeMultiplier: SAME_DAY_PRICING.SURCHARGE_MULTIPLIER
    });

    if (useBalance) {
      // Check if user has sufficient balance for the total amount
      const balance = await Balance.findOne({ user: user._id });
      
      if (!balance || balance.balanceAmount < totalPrice) {
        return NextResponse.json(
          { error: `Insufficient balance. You need ${totalPrice} AED but have ${balance?.balanceAmount || 0} AED` },
          { status: 400 }
        );
      }

      // Deduct total amount from balance
      balance.balanceAmount -= totalPrice;
      balance.history.push({
        action: 'used',
        amount: totalPrice,
        description: `Same-day booking (${totalPrice} AED total - ${surcharge} AED surcharge)`,
        createdAt: new Date(),
        appointmentId: appointmentId || 'new',
        surcharge: surcharge
      });
      await balance.save();

      // Handle reschedule or new booking
      if (isReschedule && appointmentId) {
        // Update existing appointment
        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) {
          return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
        }

        appointment.date = new Date(newDate);
        appointment.isSameDayBooking = true;
        appointment.sameDaySurcharge = surcharge;
        appointment.price = totalPrice;
        appointment.status = 'confirmed';
        await appointment.save();

        return NextResponse.json({ 
          success: true, 
          message: "Appointment rescheduled successfully with same-day surcharge",
          appointmentId: appointment._id
        });
      } else {
        // Create new appointment
        const appointment = new Appointment({
          patient: user._id,
          therapist: selectedSlot.therapistId,
          date: new Date(selectedSlot.date),
          status: 'confirmed',
          isSameDayBooking: true,
          sameDaySurcharge: surcharge,
          price: totalPrice,
          isStripeVerified: true,
          payment: 'paid'
        });
        await appointment.save();

        return NextResponse.json({ 
          success: true, 
          message: "Same-day appointment booked successfully",
          appointmentId: appointment._id
        });
      }
    } else {
      // Handle Stripe payment
      let customer: Stripe.Customer;
      if (!user.stripeCustomerId) {
        customer = await stripe.customers.create({
          email: user.email,
          name: user.fullName,
          metadata: { userId: user._id.toString() }
        });
        user.stripeCustomerId = customer.id;
        await user.save();
      } else {
        customer = await stripe.customers.retrieve(user.stripeCustomerId) as Stripe.Customer;
      }

      console.log('Creating Stripe checkout session for same-day booking:', {
        totalPrice,
        surcharge,
        unitAmount: Math.round(totalPrice * 100),
        isReschedule,
        appointmentId
      });

      const stripeSession = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: "aed",
            product_data: {
              name: "Same-Day Therapy Session",
              description: `Therapy session with 50% same-day surcharge (Base: ${SAME_DAY_PRICING.BASE_PRICE} AED + Surcharge: ${surcharge} AED)`,
            },
            unit_amount: Math.round(totalPrice * 100),
          },
          quantity: 1,
        }],
        mode: "payment",
        success_url: `${baseUrl}/payments/success?type=same_day&session_id={CHECKOUT_SESSION_ID}&appointment_id=${appointmentId || 'new'}`,
        cancel_url: `${baseUrl}/payments/cancel?type=same_day`,
        metadata: {
          userId: user._id.toString(),
          type: 'same_day_booking',
          appointmentId: appointmentId || 'new',
          isReschedule: isReschedule?.toString() || 'false',
          newDate: newDate || '',
          selectedSlot: JSON.stringify(selectedSlot || {}),
          sessionToBeReduced: sessionToBeReduced?.toString() || 'false',
          sessionIndex: sessionIndex?.toString() || '',
          idempotencyKey: uuidv4()
        },
        customer: customer.id,
        payment_intent_data: {
          metadata: {
            userId: user._id.toString(),
            type: 'same_day_booking',
            appointmentId: appointmentId || 'new',
            isReschedule: isReschedule?.toString() || 'false'
          }
        },
      });

      return NextResponse.json({ url: stripeSession.url });
    }

  } catch (error: any) {
    console.error("Same-day booking error:", error);
    return NextResponse.json(
      { error: error.message || "Error processing same-day booking" },
      { status: 500 }
    );
  }
}