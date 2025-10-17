import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { email, password, fullName, telephone, role } = await req.json();

    if (!email || !password || !fullName || !telephone || !role) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from('users')
      .insert({
        email: email.toLowerCase(),
        password: hashedPassword,
        full_name: fullName,
        telephone,
        role: role || 'patient',
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json(
          { message: "Please use different email" },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ user: data }, { status: 201 });
  } catch (error: any) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { message: "Error creating user" },
      { status: 500 }
    );
  }
}