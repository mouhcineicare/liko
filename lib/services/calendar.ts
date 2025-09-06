import ICAL from 'ical.js';
import axios from 'axios';

export async function fetchCalendarEvents(icsUrl: string) {
  try {
    const response = await axios.get(icsUrl);
    const jcalData = ICAL.parse(response.data);
    const comp = new ICAL.Component(jcalData);
    const vevents = comp.getAllSubcomponents('vevent');

    return vevents.map(vevent => {
      const event = new ICAL.Event(vevent);
      return {
        title: event.summary,
        start: event.startDate.toJSDate(),
        end: event.endDate.toJSDate(),
        description: event.description,
        location: event.location
      };
    });
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    throw error;
  }
}