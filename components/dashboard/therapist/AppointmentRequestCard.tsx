"use client";

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Loader2, Save, Edit3, ChevronDown, ChevronUp } from 'lucide-react';

interface Appointment {
  _id: string;
  patient: {
    _id: string;
    fullName: string;
  };
  date: string;
  plan: string;
  declineComment?: string;
}

interface AvailabilityDay {
  day: string;
  hours: string[];
}

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const timeSlots = Array.from({ length: 15 }, (_, i) => {
  const hour = i + 8;
  return [
    `${hour.toString().padStart(2, '0')}:00`,
    `${hour.toString().padStart(2, '0')}:30`
  ];
}).flat();

const AppointmentRequestCard: React.FC<{
  appointment: Appointment;
  onDecision: (appointmentId: string, decision: 'accept' | 'reject') => void;
}> = ({ appointment, onDecision }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [decision, setDecision] = useState<'accept' | 'reject' | null>(null);
  const [declineComment, setDeclineComment] = useState('');

  const handleAccept = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/therapist/appointments/${appointment._id}/accept`, {
        method: 'PUT',
      });
      
      if (response.ok) {
        setDecision('accept');
        onDecision(appointment._id, 'accept');
      } else {
        throw new Error('Failed to accept appointment');
      }
    } catch (error) {
      console.error('Error accepting appointment:', error);
      alert('Failed to accept appointment. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/therapist/appointments/${appointment._id}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          declineComment: declineComment || 'No reason provided' 
        }),
      });
      
      if (response.ok) {
        setDecision('reject');
        onDecision(appointment._id, 'reject');
      } else {
        throw new Error('Failed to reject appointment');
      }
    } catch (error) {
      console.error('Error rejecting appointment:', error);
      alert('Failed to reject appointment. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const appointmentDate = new Date(appointment.date);
  const formattedDate = appointmentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const formattedTime = appointmentDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="bg-white rounded-xl shadow-lg mb-6 sm:mb-8 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-2 sm:p-6">
        <p className="text-sm sm:text-base text-blue-100 font-bold">A patient has requested an appointment</p>
      </div>
      
      <div className="p-4 sm:p-6">
        <div className="flex items-center mb-4 sm:mb-6">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center mr-3 sm:mr-4">
            <User className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-800">{appointment.patient?.fullName || 'Patient'}</h3>
            <p className="text-sm sm:text-base text-gray-600">{appointment.plan}</p>
            <div className="flex items-center mt-1 text-gray-500">
              <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              <span className="text-xs sm:text-sm">{formattedTime} on {formattedDate}</span>
            </div>
          </div>
        </div>

        <div className="border-t pt-4 sm:pt-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">
            Would you like to accept this appointment?
          </h3>
          
          <div className="flex gap-3 sm:gap-4 mb-4 sm:mb-6">
            <button
              onClick={handleAccept}
              disabled={isProcessing}
              className={`flex-1 py-2 sm:py-3 px-4 sm:px-6 rounded-lg text-sm sm:text-base font-medium transition-all ${
                decision === 'accept'
                  ? 'bg-green-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              } ${isProcessing ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isProcessing && decision === 'accept' ? (
                <Loader2 className="w-4 h-4 animate-spin mx-auto" />
              ) : (
                'Accept'
              )}
            </button>
            <button
              onClick={() => setDecision('reject')}
              disabled={isProcessing}
              className={`flex-1 py-2 sm:py-3 px-4 sm:px-6 rounded-lg text-sm sm:text-base font-medium transition-all ${
                decision === 'reject'
                  ? 'bg-red-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              } ${isProcessing ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              Decline
            </button>
          </div>

          {decision === 'accept' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
              <p className="text-sm sm:text-base text-green-800 mb-3 sm:mb-4">
                By clicking "Confirm", the patient will be notified that the appointment is confirmed. 
                Please meet them on <strong>{formattedDate}</strong> at <strong>{formattedTime}</strong>.
              </p>
              <button
                onClick={handleAccept}
                disabled={isProcessing}
                className="bg-green-600 text-white px-4 sm:px-6 py-1 sm:py-2 rounded-lg hover:bg-green-700 transition-colors text-sm sm:text-base disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  'Confirm Appointment'
                )}
              </button>
            </div>
          )}

          {decision === 'reject' && (
            <div className="space-y-3 sm:space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
                <p className="text-sm sm:text-base text-red-800">
                  The patient will be asked to rebook from your availability calendar below.
                </p>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Reason for declining (optional)
                </label>
                <textarea
                  value={declineComment}
                  onChange={(e) => setDeclineComment(e.target.value)}
                  className="w-full border rounded-md p-2 text-xs sm:text-sm"
                  rows={3}
                  placeholder="Provide a reason for declining this appointment..."
                />
              </div>

              <button
                onClick={handleReject}
                disabled={isProcessing}
                className="bg-red-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-red-700 transition-colors w-full text-sm sm:text-base disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  'Confirm Decline'
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const AvailabilitySection: React.FC = () => {
  const [availability, setAvailability] = useState<AvailabilityDay[]>([]);
  const [isEditingAvailability, setIsEditingAvailability] = useState(false);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [showAvailability, setShowAvailability] = useState(false);

  useEffect(() => {
    const fetchAvailability = async () => {
      setIsLoadingAvailability(true);
      try {
        const response = await fetch('/api/therapist/profile/form');
        if (response.ok) {
          const data = await response.json();
          setAvailability(data.availability || []);
        }
      } catch (error) {
        console.error('Error fetching availability:', error);
      } finally {
        setIsLoadingAvailability(false);
      }
    };

    fetchAvailability();
  }, []);

  const updateAvailability = async (newAvailability: AvailabilityDay[]) => {
    try {
      const response = await fetch('/api/therapist/profile/form', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ availability: newAvailability }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update availability');
      }
    } catch (error) {
      console.error('Error updating availability:', error);
      throw error;
    }
  };

  const toggleTimeSlot = (day: string, time: string) => {
    if (!isEditingAvailability) return;

    setAvailability(prev => {
      const newAvailability = JSON.parse(JSON.stringify(prev));
      const dayIndex = newAvailability.findIndex((d: AvailabilityDay) => d.day === day);
      
      if (dayIndex >= 0) {
        const hourIndex = newAvailability[dayIndex].hours.indexOf(time);
        if (hourIndex >= 0) {
          newAvailability[dayIndex].hours.splice(hourIndex, 1);
          if (newAvailability[dayIndex].hours.length === 0) {
            newAvailability.splice(dayIndex, 1);
          }
        } else {
          newAvailability[dayIndex].hours.push(time);
          newAvailability[dayIndex].hours.sort();
        }
      } else {
        newAvailability.push({
          day,
          hours: [time]
        });
      }
      
      return newAvailability;
    });
  };

  const isTimeSlotSelected = (day: string, time: string) => {
    const dayAvailability = availability.find(d => d.day === day);
    return dayAvailability ? dayAvailability.hours.includes(time) : false;
  };

  const handleSaveAvailability = async () => {
    setIsLoadingAvailability(true);
    try {
      await updateAvailability(availability);
      setIsEditingAvailability(false);
      alert('Availability updated successfully!');
    } catch (error) {
      console.error('Error saving availability:', error);
      alert('Failed to save availability. Please try again.');
    } finally {
      setIsLoadingAvailability(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg">
      <div 
        className="p-4 sm:p-6 border-b cursor-pointer flex justify-between items-center"
        onClick={() => setShowAvailability(!showAvailability)}
      >
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-800">Your Availability</h2>
          <p className="text-xs sm:text-sm text-gray-600">This is what patients see when rebooking</p>
        </div>
        <div className="flex items-center gap-2">
          {showAvailability && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isEditingAvailability) {
                  handleSaveAvailability();
                } else {
                  setIsEditingAvailability(true);
                }
              }}
              disabled={isLoadingAvailability}
              className="flex items-center gap-2 bg-blue-600 text-white px-3 sm:px-4 py-1 sm:py-2 rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isEditingAvailability ? (
                <>
                  <Save className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>{isLoadingAvailability ? 'Saving...' : 'Save'}</span>
                </>
              ) : (
                <>
                  <Edit3 className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>Edit</span>
                </>
              )}
            </button>
          )}
          {showAvailability ? (
            <ChevronUp className="w-5 h-5 text-gray-600" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-600" />
          )}
        </div>
      </div>
      
      {showAvailability && (
        <div className="p-4 sm:p-6">
          {isLoadingAvailability ? (
            <div className="flex justify-center py-6 sm:py-8">
              <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin" />
            </div>
          ) : (
            <div className="grid gap-4 sm:gap-6">
              {daysOfWeek.map(day => {
                return (
                  <div key={day} className="border rounded-lg p-3 sm:p-4">
                    <h3 className="font-semibold text-sm sm:text-base text-gray-800 mb-2 sm:mb-3 flex items-center">
                      <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                      {day}
                    </h3>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-1 sm:gap-2">
                      {timeSlots.map(time => {
                        const isSelected = isTimeSlotSelected(day, time);
                        return (
                          <button
                            key={time}
                            type="button"
                            onClick={() => toggleTimeSlot(day, time)}
                            disabled={!isEditingAvailability || isLoadingAvailability}
                            className={`p-1 sm:p-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                              isSelected
                                ? isEditingAvailability
                                  ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                  : 'bg-green-100 text-green-800'
                                : isEditingAvailability
                                  ? 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                  : 'bg-gray-100 text-gray-500'
                            } ${isEditingAvailability ? 'cursor-pointer' : 'cursor-default'} ${
                              isLoadingAvailability ? 'opacity-70 cursor-not-allowed' : ''
                            }`}
                          >
                            {time}
                            {isEditingAvailability && (
                              <span className="block text-xxs sm:text-xs mt-1">
                                {isSelected ? 'Available' : 'Blocked'}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const AppointmentRequestsList: React.FC<{
  appointments: Appointment[];
  onDecision: (appointmentId: string, decision: 'accept' | 'reject') => void;
}> = ({ appointments, onDecision }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* List all appointment requests */}
        {appointments.map(appointment => (
          <AppointmentRequestCard
            key={appointment._id}
            appointment={appointment}
            onDecision={onDecision}
          />
        ))}

        {/* Single availability section at the bottom */}
        <AvailabilitySection />
      </div>
    </div>
  );
};

export default AppointmentRequestsList;