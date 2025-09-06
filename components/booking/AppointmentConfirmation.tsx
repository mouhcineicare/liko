"use client";

export function renderAppointmentConfirmationButton(
  isAgree: boolean, 
  setIsAgree: (value: boolean) => void
) {
  return (
    <div className="flex items-center justify-start mt-4 mb-2 space-x-2">
      <strong className="text-red-700 text-lg">*</strong>
      <input 
        onChange={(e) => setIsAgree(e.target.checked)}
        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
        type="checkbox" 
        title="appointment preffered timing confirmation"  
      />
      <p className="text-2sm text-gray-500 font-serif">
        I confirm that I have selected the preferred date and time for my appointment and agree to the <a className="text-blue-700" href="/refund">terms and conditions</a>.
      </p>
    </div>
  );
}