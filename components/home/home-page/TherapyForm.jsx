'use client';

import React, { useState } from 'react';

const TherapyForm = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    presentTrouble: '',
    therapyExpectations: '',
    experienceDuration: '',
    affectedAreas: [],
    associatedFeelings: [],
    positiveFeelings: [],
    sleepProblems: '',
    memoryTrouble: '',
    mindChange: '',
    persistentThoughts: '',
    mindControlIdea: '',
    trustIssues: '',
    financialProblems: '',
    mindConcern: '',
    bodyConcern: '',
    sexThoughts: '',
    loneliness: '',
    therapyTrust: '',
    frequentArguments: '',
    misunderstood: '',
    urgeToHarm: '',
    hopelessness: '',
    concentrationTrouble: '',
    noInterest: '',
    blockedGettingThingsDone: '',
    lowerBackPain: '',
    selfBlame: '',
    irritability: '',
    previousTherapy: '',
    decisionFactors: [],
    age: '',
    gender: '',
    employmentStatus: '',
    availability: [],
    therapistGender: '',
    communicationLanguage: '',
    referralSource: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleCheckboxChange = (e) => {
    const { name, value, checked } = e.target;
    setFormData({
      ...formData,
      [name]: checked
        ? [...formData[name], value]
        : formData[name].filter((item) => item !== value)
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto p-4 space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Full Name</label>
        <input
          type="text"
          name="fullName"
          value={formData.fullName}
          onChange={handleChange}
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Email</label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Phone</label>
        <input
          type="tel"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Form usually takes 2 minutes to fill. This information helps us to match you to the perfect therapist. Feel free to skip if you prefer.
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          What has been troubling you in the present that would be an objective to work in your sessions?
        </label>
        <textarea
          name="presentTrouble"
          value={formData.presentTrouble}
          onChange={handleChange}
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">What are you expecting from therapy?</label>
        <textarea
          name="therapyExpectations"
          value={formData.therapyExpectations}
          onChange={handleChange}
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          How long have you been experiencing this concerns?
        </label>
        <div className="mt-2 space-y-2">
          <div>
            <input
              type="radio"
              name="experienceDuration"
              value="Less than 6 months"
              checked={formData.experienceDuration === 'Less than 6 months'}
              onChange={handleChange}
              className="mr-2"
            />
            Less than 6 months
          </div>
          <div>
            <input
              type="radio"
              name="experienceDuration"
              value="6 months to 1 year"
              checked={formData.experienceDuration === '6 months to 1 year'}
              onChange={handleChange}
              className="mr-2"
            />
            6 months to 1 year
          </div>
          <div>
            <input
              type="radio"
              name="experienceDuration"
              value="1-2 years"
              checked={formData.experienceDuration === '1-2 years'}
              onChange={handleChange}
              className="mr-2"
            />
            1-2 years
          </div>
          <div>
            <input
              type="radio"
              name="experienceDuration"
              value="More than 2 years"
              checked={formData.experienceDuration === 'More than 2 years'}
              onChange={handleChange}
              className="mr-2"
            />
            More than 2 years
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">What areas of your life are affected by these concerns?</label>
        <div className="mt-2 space-y-2">
          <div>
            <input
              type="checkbox"
              name="affectedAreas"
              value="Relationships"
              checked={formData.affectedAreas.includes('Relationships')}
              onChange={handleCheckboxChange}
              className="mr-2"
            />
            Relationships
          </div>
          <div>
            <input
              type="checkbox"
              name="affectedAreas"
              value="Sleeping"
              checked={formData.affectedAreas.includes('Sleeping')}
              onChange={handleCheckboxChange}
              className="mr-2"
            />
            Sleeping
          </div>
          <div>
            <input
              type="checkbox"
              name="affectedAreas"
              value="Overall Mood"
              checked={formData.affectedAreas.includes('Overall Mood')}
              onChange={handleCheckboxChange}
              className="mr-2"
            />
            Overall Mood
          </div>
          <div>
            <input
              type="checkbox"
              name="affectedAreas"
              value="Work"
              checked={formData.affectedAreas.includes('Work')}
              onChange={handleCheckboxChange}
              className="mr-2"
            />
            Work
          </div>
          <div>
            <input
              type="checkbox"
              name="affectedAreas"
              value="Eating habits"
              checked={formData.affectedAreas.includes('Eating habits')}
              onChange={handleCheckboxChange}
              className="mr-2"
            />
            Eating habits
          </div>
          <div>
            <input
              type="checkbox"
              name="affectedAreas"
              value="Sexual health"
              checked={formData.affectedAreas.includes('Sexual health')}
              onChange={handleCheckboxChange}
              className="mr-2"
            />
            Sexual health
          </div>
          <div>
            <input
              type="checkbox"
              name="affectedAreas"
              value="Other"
              checked={formData.affectedAreas.includes('Other')}
              onChange={handleCheckboxChange}
              className="mr-2"
            />
            Other
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">What feelings is this concern associated with?</label>
        <div className="mt-2 space-y-2">
          <div>
            <input
              type="checkbox"
              name="associatedFeelings"
              value="Feeling lost"
              checked={formData.associatedFeelings.includes('Feeling lost')}
              onChange={handleCheckboxChange}
              className="mr-2"
            />
            Feeling lost
          </div>
          <div>
            <input
              type="checkbox"
              name="associatedFeelings"
              value="Feeling hated"
              checked={formData.associatedFeelings.includes('Feeling hated')}
              onChange={handleCheckboxChange}
              className="mr-2"
            />
            Feeling hated
          </div>
          <div>
            <input
              type="checkbox"
              name="associatedFeelings"
              value="Feeling low self esteem"
              checked={formData.associatedFeelings.includes('Feeling low self esteem')}
              onChange={handleCheckboxChange}
              className="mr-2"
            />
            Feeling low self esteem
          </div>
          <div>
            <input
              type="checkbox"
              name="associatedFeelings"
              value="Feeling low in energy"
              checked={formData.associatedFeelings.includes('Feeling low in energy')}
              onChange={handleCheckboxChange}
              className="mr-2"
            />
            Feeling low in energy
          </div>
          <div>
            <input
              type="checkbox"
              name="associatedFeelings"
              value="Feeling sad"
              checked={formData.associatedFeelings.includes('Feeling sad')}
              onChange={handleCheckboxChange}
              className="mr-2"
            />
            Feeling sad
          </div>
          <div>
            <input
              type="checkbox"
              name="associatedFeelings"
              value="Feeling stressed"
              checked={formData.associatedFeelings.includes('Feeling stressed')}
              onChange={handleCheckboxChange}
              className="mr-2"
            />
            Feeling stressed
          </div>
          <div>
            <input
              type="checkbox"
              name="associatedFeelings"
              value="Feeling anxious"
              checked={formData.associatedFeelings.includes('Feeling anxious')}
              onChange={handleCheckboxChange}
              className="mr-2"
            />
            Feeling anxious
          </div>
          <div>
            <input
              type="checkbox"
              name="associatedFeelings"
              value="Feeling overwhelmed"
              checked={formData.associatedFeelings.includes('Feeling overwhelmed')}
              onChange={handleCheckboxChange}
              className="mr-2"
            />
            Feeling overwhelmed
          </div>
          <div>
            <input
              type="checkbox"
              name="associatedFeelings"
              value="Other"
              checked={formData.associatedFeelings.includes('Other')}
              onChange={handleCheckboxChange}
              className="mr-2"
            />
            Other
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">What positive feeling is this concern associated with?</label>
        <div className="mt-2 space-y-2">
          <div>
            <input
              type="checkbox"
              name="positiveFeelings"
              value="Feeling of resilience"
              checked={formData.positiveFeelings.includes('Feeling of resilience')}
              onChange={handleCheckboxChange}
              className="mr-2"
            />
            Feeling of resilience
          </div>
          <div>
            <input
              type="checkbox"
              name="positiveFeelings"
              value="Feeling of self love"
              checked={formData.positiveFeelings.includes('Feeling of self love')}
              onChange={handleCheckboxChange}
              className="mr-2"
            />
            Feeling of self love
          </div>
          <div>
            <input
              type="checkbox"
              name="positiveFeelings"
              value="Feeling of confidence"
              checked={formData.positiveFeelings.includes('Feeling of confidence')}
              onChange={handleCheckboxChange}
              className="mr-2"
            />
            Feeling of confidence
          </div>
          <div>
            <input
              type="checkbox"
              name="positiveFeelings"
              value="Feeling of patience"
              checked={formData.positiveFeelings.includes('Feeling of patience')}
              onChange={handleCheckboxChange}
              className="mr-2"
            />
            Feeling of patience
          </div>
          <div>
            <input
              type="checkbox"
              name="positiveFeelings"
              value="Feeling of wisdom"
              checked={formData.positiveFeelings.includes('Feeling of wisdom')}
              onChange={handleCheckboxChange}
              className="mr-2"
            />
            Feeling of wisdom
          </div>
          <div>
            <input
              type="checkbox"
              name="positiveFeelings"
              value="None of the Above"
              checked={formData.positiveFeelings.includes('None of the Above')}
              onChange={handleCheckboxChange}
              className="mr-2"
            />
            None of the Above
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Do you face problems sleeping?</label>
        <div className="mt-2 space-y-2">
          <div>
            <input
              type="radio"
              name="sleepProblems"
              value="Yes"
              checked={formData.sleepProblems === 'Yes'}
              onChange={handleChange}
              className="mr-2"
            />
            Yes
          </div>
          <div>
            <input
              type="radio"
              name="sleepProblems"
              value="No"
              checked={formData.sleepProblems === 'No'}
              onChange={handleChange}
              className="mr-2"
            />
            No
          </div>
        </div>
      </div>


    </form>
  );
};

export default TherapyForm;
