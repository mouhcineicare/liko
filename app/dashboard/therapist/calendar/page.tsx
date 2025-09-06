'use client'
import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addMonths, addWeeks, addDays, startOfMonth, endOfMonth, startOfDay, endOfDay, startOfWeek as getStartOfWeek, endOfWeek as getEndOfWeek } from 'date-fns';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Button, Select, Spin, message, Card, Tag, Modal, Typography } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { Event } from '@/types/types';

const { Text } = Typography;

const locales = {
  'en-US': require('date-fns/locale/en-US'),
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const TherapistCalendar = () => {
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<string>(Views.MONTH);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  // Fetch all appointments once on component mount
  const fetchAllAppointments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/therapist/sessions?page=1&limit=1000`);
      const data = await response.json();
      
      if (response.ok) {
        const formattedEvents = data.appointments.map((appt: any) => ({
          id: appt._id,
          title: `${appt.patient.fullName} - ${appt.plan}`,
          start: new Date(appt.date),
          end: new Date(new Date(appt.date).getTime() + 60 * 60 * 1000), // 1 hour duration
          allDay: false,
          resource: {
            status: appt.status,
            paymentStatus: appt.paymentStatus,
            meetingLink: appt.meetingLink,
            patient: appt.patient,
            price: appt.price,
            therapyType: appt.therapyType,
          },
        }));
        
        setAllEvents(formattedEvents);
      } else {
        message.error('Failed to fetch appointments');
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
      message.error('Error loading calendar data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllAppointments();
  }, []);

  // Filter events based on current view and date
  const filteredEvents = useMemo(() => {
    if (!allEvents.length) return [];

    let startDate: Date;
    let endDate: Date;

    switch (currentView) {
      case Views.MONTH:
        startDate = startOfMonth(currentDate);
        endDate = endOfMonth(currentDate);
        break;
      case Views.WEEK:
        startDate = getStartOfWeek(currentDate);
        endDate = getEndOfWeek(currentDate);
        break;
      case Views.DAY:
      default:
        startDate = startOfDay(currentDate);
        endDate = endOfDay(currentDate);
        break;
    }

    return allEvents.filter(event => {
      return event.start >= startDate && event.start <= endDate;
    });
  }, [allEvents, currentView, currentDate]);

  const navigate = (action: 'PREV' | 'NEXT' | 'TODAY') => {
    let newDate = currentDate;

    switch (action) {
      case 'PREV':
        if (currentView === Views.MONTH) {
          newDate = addMonths(currentDate, -1);
        } else if (currentView === Views.WEEK) {
          newDate = addWeeks(currentDate, -1);
        } else {
          newDate = addDays(currentDate, -1);
        }
        break;
      case 'NEXT':
        if (currentView === Views.MONTH) {
          newDate = addMonths(currentDate, 1);
        } else if (currentView === Views.WEEK) {
          newDate = addWeeks(currentDate, 1);
        } else {
          newDate = addDays(currentDate, 1);
        }
        break;
      case 'TODAY':
        newDate = new Date();
        break;
    }

    setCurrentDate(newDate);
  };

  const onNavigate = (newDate: Date) => {
    setCurrentDate(newDate);
  };

  const onView = (newView: string) => {
    setCurrentView(newView as any);
  };

  const handleSelectEvent = (event: Event) => {
    setSelectedEvent(event);
  };

  const handleCloseModal = () => {
    setSelectedEvent(null);
  };

  const eventStyleGetter = (event: Event) => {
    let backgroundColor = '#3174ad';
    let borderColor = '#3174ad';
    
    if (event.resource.status === 'completed') {
      backgroundColor = '#4CAF50';
      borderColor = '#4CAF50';
    } else if (event.resource.status === 'cancelled') {
      backgroundColor = '#F44336';
      borderColor = '#F44336';
    } else if (event.resource.status === 'pending') {
      backgroundColor = '#FF9800';
      borderColor = '#FF9800';
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.8,
        color: 'white',
        border: `1px solid ${borderColor}`,
        display: 'block',
      },
    };
  };

  const CustomToolbar = () => {
    return (
      <div className="rbc-toolbar">
        <span className="rbc-btn-group">
          <Button onClick={() => navigate('PREV')} icon={<LeftOutlined />} />
          <Button onClick={() => navigate('TODAY')}>Today</Button>
          <Button onClick={() => navigate('NEXT')} icon={<RightOutlined />} />
        </span>
        <span className="rbc-toolbar-label">
          {format(currentDate, currentView === Views.MONTH ? 'MMMM yyyy' : 
           currentView === Views.WEEK ? 'MMMM d, yyyy' : 'EEEE, MMMM d, yyyy')}
        </span>
        <span className="rbc-btn-group">
          <Select
            value={currentView}
            style={{ width: 120 }}
            onChange={onView}
            options={[
              { value: Views.DAY, label: 'Day' },
              { value: Views.WEEK, label: 'Week' },
              { value: Views.MONTH, label: 'Month' },
              { value: Views.AGENDA, label: 'Agenda' },
            ]}
          />
        </span>
      </div>
    );
  };

  return (
    <div className="therapist-calendar-container">
      <Card title="Calendar">
        {loading ? (
          <div className="loading-container">
            <Spin size="large" />
          </div>
        ) : (
          <div className="calendar-wrapper">
            <Calendar
              localizer={localizer}
              events={filteredEvents}
              startAccessor="start"
              endAccessor="end"
              style={{ height: 700 }}
              onSelectEvent={handleSelectEvent}
              view={currentView}
              onView={onView}
              date={currentDate}
              onNavigate={onNavigate}
              eventPropGetter={eventStyleGetter}
              defaultView={Views.MONTH}
              components={{
                toolbar: CustomToolbar,
                event: CustomEvent,
              }}
            />
          </div>
        )}
      </Card>

      <EventDetailsModal 
        event={selectedEvent} 
        onClose={handleCloseModal} 
      />
    </div>
  );
};

const CustomEvent = ({ event }: { event: Event }) => {
  return (
    <div className="rbc-event-content">
      <strong>{event.title}</strong>
      <div className="event-time">
        {format(event.start, 'h:mm a')} - {format(event.end, 'h:mm a')}
      </div>
    </div>
  );
};

const EventDetailsModal = ({ event, onClose }: { event: Event | null, onClose: () => void }) => {
  if (!event) return null;

  return (
    <Modal
      title="Appointment Details"
      open={!!event}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
        event.resource.meetingLink && (
          <Button 
            key="join" 
            type="primary" 
            href={event.resource.meetingLink} 
            target="_blank"
          >
            Join Meeting
          </Button>
        ),
      ]}
      width={700}
    >
      <div className="event-details">
        <div className="detail-row">
          <Text strong>Patient:</Text>
          <Text>{event.resource.patient.fullName}</Text>
        </div>
        <div className="detail-row">
          <Text strong>Date & Time:</Text>
          <Text>
            {format(event.start, 'MMMM d, yyyy')} at {format(event.start, 'h:mm a')}
          </Text>
        </div>
        <div className="detail-row">
          <Text strong>Duration:</Text>
          <Text>1 hour</Text>
        </div>
        <div className="detail-row">
          <Text strong>Service:</Text>
          <Text>{event.title.split('-')[1]?.trim()}</Text>
        </div>
        <div className="detail-row">
          <Text strong>Type:</Text>
          <Text>{event.resource.therapyType}</Text>
        </div>
        <div className="detail-row">
          <Text strong>Price:</Text>
          <Text>AED {event.resource.price}</Text>
        </div>
        <div className="detail-row">
          <Text strong>Status:</Text>
          <Tag 
            color={
              event.resource.status === 'completed' ? 'green' : 
              event.resource.status === 'cancelled' ? 'red' : 'orange'
            }
          >
            {event.resource.status.toUpperCase()}
          </Tag>
        </div>
        <div className="detail-row">
          <Text strong>Payment:</Text>
          <Tag 
            color={event.resource.paymentStatus === 'completed' ? 'green' : 'orange'}
          >
            {event.resource.paymentStatus.toUpperCase()}
          </Tag>
        </div>
      </div>
    </Modal>
  );
};

export default TherapistCalendar;