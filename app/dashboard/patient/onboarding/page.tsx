"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";

const inputStyles = "bg-white border-gray-300 text-black";
const labelStyles = "text-black font-medium";
const checkboxLabelStyles = "text-black";
const sectionTitleStyles = "text-2xl text-blue-600 font-semibold text-black mb-4";
const questionGroupStyles = "bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-2";

const AFFECTED_AREAS = [
  "Relationships",
  "Sleeping",
  "Overall Mood",
  "Work",
  "Eating habits",
  "Sexual health",
  "Other"
];

const NEGATIVE_EMOTIONS = [
  "Feeling lost",
  "Feeling hated",
  "Feeling low self esteem",
  "Feeling low in energy",
  "Feeling sad",
  "Feeling stressed",
  "Feeling anxious",
  "Feeling overwhelmed",
  "Other"
];

const POSITIVE_EMOTIONS = [
  "Feeling of resilience",
  "Feeling of self love",
  "Feeling of confidence",
  "Feeling of patience",
  "Feeling of wisdom",
  "None of the Above"
];

const TRUST_FACTORS = [
  "Affordable Pricing",
  "The Commitment to providing affordable, high-quality mental health service",
  "I believe startups come with innovative and better solutions, and i want to try iCarewellbeing",
  "I've read fantastic authentic reviews about iCarewellbeing",
  "I've got referrals that you are experts at matching people to the right therapist",
  "I have some doubts, but I will give it a try"
];

const AGE_GROUPS = ["13-17", "18-25", "26-35", "36-45", "46-55", "56+"];

const AVAILABILITY = [
  "Weekday mornings",
  "Weekday afternoons",
  "Weekday evenings",
  "Weekends",
  "No preference"
];

const LANGUAGES = [
  "English",
  "Arabic",
  "Hindi",
  "French",
  "Spanish",
  "Arabic (Moroccan)",
  "Other"
];

const REFERRAL_SOURCES = [
  "A clinic or public hospital referral",
  "Referral from Life Pharmacy",
  "Referral from friend or family member",
  "Social media",
  "Google Search",
  "Referral from American Hospital"
];

const yesNoQuestions = [
  { field: "sleepingProblems", label: "Do you face problems sleeping?" },
  { field: "memoryProblems", label: "Do you have trouble remembering things?" },
  { field: "indecisive", label: "Do you constantly change your mind?" },
  { field: "intrusiveThoughts", label: "Do you have thoughts that won't leave your mind?" },
  { field: "mindControlConcerns", label: "Do you have the idea that someone else can control your mind?" },
  { field: "trustIssues", label: "Do you feel that most people can't be trusted?" },
  { field: "financialProblems", label: "Are you currently facing financial problems?" },
  { field: "mentalHealthConcerns", label: "Do you have the idea that something is wrong in your mind?" },
  { field: "physicalHealthConcerns", label: "Do you have the idea that something serious is wrong with your body?" },
  { field: "sexualThoughts", label: "Having thoughts about sex that bother you a lot?" },
  { field: "loneliness", label: "Feeling lonely?" },
  { field: "therapyTrust", label: "Do you trust therapy is an effective treatment for your problem?" },
  { field: "frequentArguments", label: "Getting into frequent arguments?" },
  { field: "feelingMisunderstood", label: "Feelings that others do not understand you or unsympathetic?" },
  { field: "violentUrges", label: "Having urge to beat, injure or harm someone?" },
  { field: "hopelessness", label: "Feeling hopeless about the future?" },
  { field: "concentrationIssues", label: "Trouble concentrating?" },
  { field: "lackOfInterest", label: "Feeling no interest in things?" },
  { field: "feelingBlocked", label: "Feeling blocked in getting things done?" },
  { field: "backPain", label: "Pain in lower back?" },
  { field: "selfBlame", label: "Do you blame yourself for things?" },
  { field: "irritability", label: "Feeling easily annoyed or irritated?" },
  { field: "previousTherapy", label: "Have you ever been in therapy before?" }
];

export default function OnboardingPage() {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchOnboardingData();
  }, []);

  const fetchOnboardingData = async () => {
    try {
      const response = await fetch("/api/patient/onboarding");
      if (!response.ok) {
        throw new Error("Failed to fetch onboarding data");
      }
      const data = await response.json();
      
      // Initialize form data with existing responses
      const initialFormData: Record<string, any> = {};
      data.responses?.forEach((response: any) => {
        initialFormData[response.questionId] = response.answer;
      });
      setFormData(initialFormData);
    } catch (error) {
      console.error("Error fetching onboarding data:", error);
      toast.error("Failed to load onboarding data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCheckboxChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: Array.isArray(prev[field]) 
        ? prev[field].includes(value)
          ? prev[field].filter((v: string) => v !== value)
          : [...prev[field], value]
        : [value]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // Format responses
      const responses = [
        {
          questionId: "troublingConcerns",
          question: "What has been troubling you?",
          answer: formData.troublingConcerns || "",
          type: "text"
        },
        {
          questionId: "therapyExpectations",
          question: "What are you expecting from therapy?",
          answer: formData.therapyExpectations || "",
          type: "text"
        },
        {
          questionId: "concernsDuration",
          question: "How long have you been experiencing these concerns?",
          answer: formData.concernsDuration || "",
          type: "radio"
        },
        {
          questionId: "affectedAreas",
          question: "What areas of your life are affected by these concerns?",
          answer: formData.affectedAreas || [],
          type: "checkbox"
        },
        {
          questionId: "negativeEmotions",
          question: "What feelings is this concern associated with?",
          answer: formData.negativeEmotions || [],
          type: "checkbox"
        },
        {
          questionId: "positiveEmotions",
          question: "What positive feeling is this concern associated with?",
          answer: formData.positiveEmotions || [],
          type: "checkbox"
        },
        ...yesNoQuestions.map(q => ({
          questionId: q.field,
          question: q.label,
          answer: formData[q.field] || false,
          type: "boolean"
        })),
        {
          questionId: "ageGroup",
          question: "Age Group",
          answer: formData.ageGroup || "",
          type: "radio"
        },
        {
          questionId: "trustFactors",
          question: "Trust Factors",
          answer: formData.trustFactors || [],
          type: "checkbox"
        },
        {
          questionId: "availability",
          question: "Availability",
          answer: formData.availability || [],
          type: "checkbox"
        },
        {
          questionId: "therapistGenderPreference",
          question: "Therapist Gender Preference",
          answer: formData.therapistGenderPreference || "",
          type: "radio"
        },
        {
          questionId: "communicationLanguage",
          question: "Communication Language",
          answer: formData.communicationLanguage || [],
          type: "checkbox"
        },
        {
          questionId: "referralSource",
          question: "Referral Source",
          answer: formData.referralSource || "",
          type: "radio"
        }
      ];

      const response = await fetch("/api/patient/onboarding", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ responses }),
      });

      if (!response.ok) {
        throw new Error("Failed to update onboarding data");
      }

      toast.success("Onboarding information updated successfully");
    } catch (error) {
      console.error("Error updating onboarding data:", error);
      toast.error("Failed to update onboarding information");
    } finally {
      setIsSaving(false);
    }
  };

  const renderYesNoQuestion = (field: string, label: string) => (
    <div className={questionGroupStyles}>
      <Label className={`${labelStyles} block mb-3`}>{label}</Label>
      <RadioGroup
        value={formData[field]?.toString()}
        onValueChange={(value) => handleInputChange(field, value === "true")}
        className="flex space-x-6"
      >
        <div className="flex items-center space-x-3">
          <RadioGroupItem 
            value="true" 
            id={`${field}-yes`} 
            className="h-5 w-5 border-2 border-gray-300 data-[state=checked]:border-blue-600"
          />
          <Label htmlFor={`${field}-yes`} className={checkboxLabelStyles}>Yes</Label>
        </div>
        <div className="flex items-center space-x-3">
          <RadioGroupItem 
            value="false" 
            id={`${field}-no`} 
            className="h-5 w-5 border-2 border-gray-300 data-[state=checked]:border-blue-600"
          />
          <Label htmlFor={`${field}-no`} className={checkboxLabelStyles}>No</Label>
        </div>
      </RadioGroup>
    </div>
  );

  const renderCheckboxSection = (title: string, options: string[], field: string) => (
    <div className={questionGroupStyles}>
      <Label className={`${labelStyles} block mb-3`}>{title}</Label>
      <div className="flex flex-col space-y-2">
        {options.map((option) => (
          <div key={option} className="flex items-center space-x-3">
            <Checkbox
              id={`${field}-${option}`}
              checked={Array.isArray(formData[field]) && formData[field]?.includes(option)}
              onCheckedChange={(checked) => {
                if (checked !== "indeterminate") {
                  handleCheckboxChange(field, option);
                }
              }}
              className="h-5 w-5 border-2 border-gray-300 rounded data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
            />
            <Label htmlFor={`${field}-${option}`} className={checkboxLabelStyles}>{option}</Label>
          </div>
        ))}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Update Onboarding Information</h1>
        <p className="text-gray-600 mt-2">
          Review and update your therapy preferences and information below.
        </p>
      </div>

      <Card className="p-6 bg-white">
        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <h2 className={sectionTitleStyles}>Concerns</h2>
            <div className="space-y-6">
              <div className={'w-full'}>
                <Label htmlFor="troublingConcerns" className={labelStyles}>
                  What has been troubling you in the present that would be an objective to work in your sessions?
                </Label>
                <Textarea
                  id="troublingConcerns"
                  value={formData.troublingConcerns || ""}
                  onChange={(e) => handleInputChange("troublingConcerns", e.target.value)}
                  className={`${inputStyles} min-h-[100px]`}
                  placeholder="Please describe your concerns..."
                />
              </div>

              <div className={'w-full'}>
                <Label htmlFor="therapyExpectations" className={labelStyles}>
                  What are you expecting from therapy?
                </Label>
                <Textarea
                  id="therapyExpectations"
                  value={formData.therapyExpectations || ""}
                  onChange={(e) => handleInputChange("therapyExpectations", e.target.value)}
                  className={`${inputStyles} min-h-[100px]`}
                  placeholder="Please describe your expectations..."
                />
              </div>

              <div className={questionGroupStyles}>
                <Label className={`${labelStyles} block mb-3`}>How long have you been experiencing these concerns?</Label>
                <RadioGroup
                  value={formData.concernsDuration || ""}
                  onValueChange={(value) => handleInputChange("concernsDuration", value)}
                  className="space-y-3"
                >
                  {[
                    "Less than 6 months",
                    "6 months to 1 year",
                    "1-2 years",
                    "More than 2 years"
                  ].map((option) => (
                    <div key={option} className="flex items-center space-x-3">
                      <RadioGroupItem 
                        value={option} 
                        id={option} 
                        className="h-5 w-5 border-2 border-gray-300 data-[state=checked]:border-blue-600"
                      />
                      <Label htmlFor={option} className={checkboxLabelStyles}>{option}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {renderCheckboxSection(
                "What areas of your life are affected by these concerns?",
                AFFECTED_AREAS,
                "affectedAreas"
              )}

              {renderCheckboxSection(
                "What feelings is this concern associated with?",
                NEGATIVE_EMOTIONS,
                "negativeEmotions"
              )}

              {renderCheckboxSection(
                "What positive feeling is this concern associated with?",
                POSITIVE_EMOTIONS,
                "positiveEmotions"
              )}

              <h2 className={sectionTitleStyles}>Mental Health Indicators</h2>

              {yesNoQuestions.map(({ field, label }) => (
                renderYesNoQuestion(field, label)
              ))}

              <h2 className={sectionTitleStyles}>Demographics</h2>
              <div className={questionGroupStyles}>
                <Label className={`${labelStyles} block mb-3`}>How old are you?</Label>
                <RadioGroup
                  value={formData.ageGroup || ""}
                  onValueChange={(value) => handleInputChange("ageGroup", value)}
                  className="space-y-3"
                >
                  {AGE_GROUPS.map((age) => (
                    <div key={age} className="flex items-center space-x-3">
                      <RadioGroupItem 
                        value={age} 
                        id={`age-${age}`} 
                        className="h-5 w-5 border-2 border-gray-300 data-[state=checked]:border-blue-600"
                      />
                      <Label htmlFor={`age-${age}`} className={checkboxLabelStyles}>{age}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <h2 className={sectionTitleStyles}>Decision Factor</h2>

              {renderCheckboxSection(
                "What factors influenced your decision to trust iCarewellbeing as a reliable option for matching you with the right therapist?",
                TRUST_FACTORS,
                "trustFactors"
              )}

              <h2 className={sectionTitleStyles}>Therapist Preferences</h2>

              {renderCheckboxSection(
                "For your ongoing therapeutic sessions, please indicate your availability considerations:",
                AVAILABILITY,
                "availability"
              )}

              <div className={questionGroupStyles}>
                <Label className={`${labelStyles} block mb-3`}>Do you have a preference for the therapist's gender?</Label>
                <RadioGroup
                  value={formData.therapistGenderPreference || ""}
                  onValueChange={(value) => handleInputChange("therapistGenderPreference", value)}
                  className="space-y-3"
                >
                  {["Male", "Female", "No preference"].map((gender) => (
                    <div key={gender} className="flex items-center space-x-3">
                      <RadioGroupItem 
                        value={gender} 
                        id={`therapist-gender-${gender}`} 
                        className="h-5 w-5 border-2 border-gray-300 data-[state=checked]:border-blue-600"
                      />
                      <Label htmlFor={`therapist-gender-${gender}`} className={checkboxLabelStyles}>{gender}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {renderCheckboxSection(
                "Language of preference for communication with your therapist:",
                LANGUAGES,
                "communicationLanguage"
              )}

              <div className={questionGroupStyles}>
                <Label className={`${labelStyles} block mb-3`}>How did you hear about iCarewellbeing?</Label>
                <RadioGroup
                  value={formData.referralSource || ""}
                  onValueChange={(value) => handleInputChange("referralSource", value)}
                  className="space-y-3"
                >
                  {REFERRAL_SOURCES.map((source) => (
                    <div key={source} className="flex items-center space-x-3">
                      <RadioGroupItem 
                        value={source} 
                        id={`referral-${source}`} 
                        className="h-5 w-5 border-2 border-gray-300 data-[state=checked]:border-blue-600"
                      />
                      <Label htmlFor={`referral-${source}`} className={checkboxLabelStyles}>{source}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div className="bg-blue-50 p-6 rounded-lg border border-blue-200 mt-8">
                <p className="text-blue-900 mb-4">
                  We highly value your privacy and the information you've shared with us. Your responses are confidential and will be handled with the utmost care. They will only be used for the purpose of matching you with an appropriate qualified therapist.
                </p>
                <p className="text-blue-900 mt-4 font-medium">
                  By proceeding, you consent that the provided information in this form is accurate and completed to the best of your knowledge.
                </p>
              </div>

              <div className="pt-6">
                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving Changes...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
}