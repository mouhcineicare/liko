import AppointmentsPage from "@/components/dashboard/patient/AppointmentsPage";

export default async function PatientAppointmentsPage() {
  // Fetch initial appointments from the API (server-side)
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/patient/appointments?skip=0&limit=4&date=${Date.now()}`,
    { cache: 'no-store', headers: { 'Content-Type': 'application/json' } }
  );
  let appointments = [];
  if (res.ok) {
    const data = await res.json();
    appointments = data.appointments || [];
  }

  return <AppointmentsPage appointments={appointments} />;
}

