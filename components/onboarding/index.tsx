import type React from "react"
import { useState, Suspense, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { toast } from "sonner"
import { Textarea } from "@/components/ui/textarea"
import { Spin } from "antd"

const inputStyles = "border-gray-300 text-black bg-onbording"
const labelStyles = "text-black font-medium"
const checkboxLabelStyles = "text-black"
const sectionTitleStyles = "text-2xl text-blue-600 font-semibold text-black mb-4"
const questionGroupStyles = "p-6 rounded-lg shadow-sm space-y-2 bg-onbording"

interface OnboardingFormData {
  email: string
  password: string
  fullName: string
  telephone: string
  countryCode: string
  troublingConcerns?: string
  therapyExpectations?: string
  concernsDuration?: string
  affectedAreas?: string[]
  negativeEmotions?: string[]
  positiveEmotions?: string[]
  sleepingProblems?: boolean
  memoryProblems?: boolean
  indecisive?: boolean
  intrusiveThoughts?: boolean
  mindControlConcerns?: boolean
  trustIssues?: boolean
  financialProblems?: boolean
  mentalHealthConcerns?: boolean
  physicalHealthConcerns?: boolean
  sexualThoughts?: boolean
  loneliness?: boolean
  therapyTrust?: boolean
  frequentArguments?: boolean
  feelingMisunderstood?: boolean
  violentUrges?: boolean
  hopelessness?: boolean
  concentrationIssues?: boolean
  lackOfInterest?: boolean
  feelingBlocked?: boolean
  backPain?: boolean
  selfBlame?: boolean
  irritability?: boolean
  previousTherapy?: boolean
  trustFactors?: string[]
  ageGroup?: string
  gender?: string
  employmentStatus?: string
  availability?: string[]
  therapistGenderPreference?: string
  communicationLanguage?: string[]
  referralSource?: string
  // Children therapy fields
  age?: string
  schoolYear?: string
  livesWith?: string
  therapyReason?: string
  professionalRecommendation?: string
  schoolDifficulties?: boolean
  socialSkillsDifficulties?: boolean
  behaviorDifficulties?: boolean
  anxietySigns?: boolean
  eatingDifficulties?: boolean
  emotionalDifficulties?: boolean
  enjoyedActivities?: boolean
  healthIssues?: string
  previousChildTherapy?: string
  // Couples therapy fields
  partnerAge?: string
  partnerGender?: string
  profession?: string
  partnerProfession?: string
  couplesTherapyReason?: string
  issuesStartDate?: string
  previousSolutions?: string
  therapyExpectationsCouple?: string
  healthIssuesCouple?: string
  currentTherapyStatus?: string
  // Psychiatry fields
  psychiatryAge?: string
  psychiatryGender?: string
  psychiatryProfession?: string
  psychiatryReason?: string
  psychiatrySymptomsDuration?: string
  psychiatryPreviousDiagnoses?: string
  psychiatryPreviousAppointment?: string
  psychiatryLivingArrangement?: string
  psychiatryAnxietyStressMood?: string
  psychiatryIntrusiveThoughts?: string
  psychiatrySleepAppetiteChanges?: string
  psychiatryRiskToSelfOrOthers?: string
  psychiatryDailyActivities?: string
  psychiatryExpectations?: string
}


const countryCodes = [
  { code: "+93", name: "AF" },
  { code: "+355", name: "AL" },
  { code: "+213", name: "DZ" },
  { code: "+376", name: "AD" },
  { code: "+244", name: "AO" },
  { code: "+1", name: "AG" },
  { code: "+54", name: "AR" },
  { code: "+374", name: "AM" },
  { code: "+61", name: "AU" },
  { code: "+43", name: "AT" },
  { code: "+994", name: "AZ" },
  { code: "+1", name: "BS" },
  { code: "+973", name: "BH" },
  { code: "+880", name: "BD" },
  { code: "+1", name: "BB" },
  { code: "+375", name: "BY" },
  { code: "+32", name: "BE" },
  { code: "+501", name: "BZ" },
  { code: "+229", name: "BJ" },
  { code: "+975", name: "BT" },
  { code: "+591", name: "BO" },
  { code: "+387", name: "BA" },
  { code: "+267", name: "BW" },
  { code: "+55", name: "BR" },
  { code: "+673", name: "BN" },
  { code: "+359", name: "BG" },
  { code: "+226", name: "BF" },
  { code: "+257", name: "BI" },
  { code: "+855", name: "KH" },
  { code: "+237", name: "CM" },
  { code: "+1", name: "CA" },
  { code: "+238", name: "CV" },
  { code: "+236", name: "CF" },
  { code: "+235", name: "TD" },
  { code: "+56", name: "CL" },
  { code: "+86", name: "CN" },
  { code: "+57", name: "CO" },
  { code: "+269", name: "KM" },
  { code: "+242", name: "CG" },
  { code: "+506", name: "CR" },
  { code: "+385", name: "HR" },
  { code: "+53", name: "CU" },
  { code: "+357", name: "CY" },
  { code: "+420", name: "CZ" },
  { code: "+45", name: "DK" },
  { code: "+253", name: "DJ" },
  { code: "+1", name: "DM" },
  { code: "+1", name: "DO" },
  { code: "+670", name: "TL" },
  { code: "+593", name: "EC" },
  { code: "+20", name: "EG" },
  { code: "+503", name: "SV" },
  { code: "+240", name: "GQ" },
  { code: "+291", name: "ER" },
  { code: "+372", name: "EE" },
  { code: "+251", name: "ET" },
  { code: "+679", name: "FJ" },
  { code: "+358", name: "FI" },
  { code: "+33", name: "FR" },
  { code: "+241", name: "GA" },
  { code: "+220", name: "GM" },
  { code: "+995", name: "GE" },
  { code: "+49", name: "DE" },
  { code: "+233", name: "GH" },
  { code: "+30", name: "GR" },
  { code: "+1", name: "GD" },
  { code: "+502", name: "GT" },
  { code: "+224", name: "GN" },
  { code: "+245", name: "GW" },
  { code: "+592", name: "GY" },
  { code: "+509", name: "HT" },
  { code: "+504", name: "HN" },
  { code: "+852", name: "HK" },
  { code: "+36", name: "HU" },
  { code: "+354", name: "IS" },
  { code: "+91", name: "IN" },
  { code: "+62", name: "ID" },
  { code: "+98", name: "IR" },
  { code: "+964", name: "IQ" },
  { code: "+353", name: "IE" },
  { code: "+972", name: "IL" },
  { code: "+39", name: "IT" },
  { code: "+1", name: "JM" },
  { code: "+81", name: "JP" },
  { code: "+962", name: "JO" },
  { code: "+7", name: "KZ" },
  { code: "+254", name: "KE" },
  { code: "+686", name: "KI" },
  { code: "+850", name: "KP" },
  { code: "+82", name: "KR" },
  { code: "+965", name: "KW" },
  { code: "+996", name: "KG" },
  { code: "+856", name: "LA" },
  { code: "+371", name: "LV" },
  { code: "+961", name: "LB" },
  { code: "+266", name: "LS" },
  { code: "+231", name: "LR" },
  { code: "+218", name: "LY" },
  { code: "+423", name: "LI" },
  { code: "+370", name: "LT" },
  { code: "+352", name: "LU" },
  { code: "+853", name: "MO" },
  { code: "+389", name: "MK" },
  { code: "+261", name: "MG" },
  { code: "+265", name: "MW" },
  { code: "+60", name: "MY" },
  { code: "+960", name: "MV" },
  { code: "+223", name: "ML" },
  { code: "+356", name: "MT" },
  { code: "+692", name: "MH" },
  { code: "+222", name: "MR" },
  { code: "+230", name: "MU" },
  { code: "+52", name: "MX" },
  { code: "+691", name: "FM" },
  { code: "+373", name: "MD" },
  { code: "+377", name: "MC" },
  { code: "+976", name: "MN" },
  { code: "+382", name: "ME" },
  { code: "+212", name: "MA" },
  { code: "+258", name: "MZ" },
  { code: "+95", name: "MM" },
  { code: "+264", name: "NA" },
  { code: "+674", name: "NR" },
  { code: "+977", name: "NP" },
  { code: "+31", name: "NL" },
  { code: "+64", name: "NZ" },
  { code: "+505", name: "NI" },
  { code: "+227", name: "NE" },
  { code: "+234", name: "NG" },
  { code: "+47", name: "NO" },
  { code: "+968", name: "OM" },
  { code: "+92", name: "PK" },
  { code: "+680", name: "PW" },
  { code: "+970", name: "PS" },
  { code: "+507", name: "PA" },
  { code: "+675", name: "PG" },
  { code: "+595", name: "PY" },
  { code: "+51", name: "PE" },
  { code: "+63", name: "PH" },
  { code: "+48", name: "PL" },
  { code: "+351", name: "PT" },
  { code: "+974", name: "QA" },
  { code: "+40", name: "RO" },
  { code: "+7", name: "RU" },
  { code: "+250", name: "RW" },
  { code: "+1", name: "KN" },
  { code: "+1", name: "LC" },
  { code: "+1", name: "VC" },
  { code: "+685", name: "WS" },
  { code: "+378", name: "SM" },
  { code: "+239", name: "ST" },
  { code: "+966", name: "SA" },
  { code: "+221", name: "SN" },
  { code: "+381", name: "RS" },
  { code: "+248", name: "SC" },
  { code: "+232", name: "SL" },
  { code: "+65", name: "SG" },
  { code: "+421", name: "SK" },
  { code: "+386", name: "SI" },
  { code: "+677", name: "SB" },
  { code: "+252", name: "SO" },
  { code: "+27", name: "ZA" },
  { code: "+211", name: "SS" },
  { code: "+34", name: "ES" },
  { code: "+94", name: "LK" },
  { code: "+249", name: "SD" },
  { code: "+597", name: "SR" },
  { code: "+268", name: "SZ" },
  { code: "+46", name: "SE" },
  { code: "+41", name: "CH" },
  { code: "+963", name: "SY" },
  { code: "+886", name: "TW" },
  { code: "+992", name: "TJ" },
  { code: "+255", name: "TZ" },
  { code: "+66", name: "TH" },
  { code: "+228", name: "TG" },
  { code: "+676", name: "TO" },
  { code: "+1", name: "TT" },
  { code: "+216", name: "TN" },
  { code: "+90", name: "TR" },
  { code: "+993", name: "TM" },
  { code: "+688", name: "TV" },
  { code: "+256", name: "UG" },
  { code: "+380", name: "UA" },
  { code: "+971", name: "AE" },
  { code: "+44", name: "GB" },
  { code: "+1", name: "US" },
  { code: "+598", name: "UY" },
  { code: "+998", name: "UZ" },
  { code: "+678", name: "VU" },
  { code: "+379", name: "VA" },
  { code: "+58", name: "VE" },
  { code: "+84", name: "VN" },
  { code: "+967", name: "YE" },
  { code: "+260", name: "ZM" },
  { code: "+263", name: "ZW" },
]

interface OnboardingProps {
  appointmentData: {
    date: string
    plan: string
    price: number
    therapyType: string
    status: string
    planType: string
    recurring: string[]
  }
  onSuccess: () => void
}

const AFFECTED_AREAS = ["Relationships", "Sleeping", "Overall Mood", "Work", "Eating habits", "Sexual health", "Other"]

const NEGATIVE_EMOTIONS = [
  "Feeling lost",
  "Feeling hated",
  "Feeling low self esteem",
  "Feeling low in energy",
  "Feeling sad",
  "Feeling stressed",
  "Feeling anxious",
  "Feeling overwhelmed",
  "Other",
]

const POSITIVE_EMOTIONS = [
  "Feeling of resilience",
  "Feeling of self love",
  "Feeling of confidence",
  "Feeling of patience",
  "Feeling of wisdom",
  "None of the Above",
]

const TRUST_FACTORS = [
  "Affordable Pricing",
  "The Commitment to providing affordable, high-quality mental health service",
  "I believe startups come with innovative and better solutions, and i want to try iCarewellbeing",
  "I've read fantastic authentic reviews about iCarewellbeing",
  "I've got referrals that you are experts at matching people to the right therapist",
  "I have some doubts, but I will give it a try",
]

const AGE_GROUPS = ["13-17", "18-25", "26-35", "36-45", "46-55", "56+"]

const GENDERS = ["Male", "Female", "Non-binary", "Prefer not to say"]

const EMPLOYMENT_STATUSES = ["Employed full-time", "Employed part-time", "Unemployed", "Student", "Retired", "Other"]

const AVAILABILITY = ["Weekday mornings", "Weekday afternoons", "Weekday evenings", "Weekends", "No preference"]

const LANGUAGES = ["English", "Arabic", "Hindi", "French", "Spanish", "Arabic (Moroccan)", "Other"]

const REFERRAL_SOURCES = [
  "A clinic or public hospital referral",
  "Referral from Life Pharmacy",
  "Referral from friend or family member",
  "Social media",
  "Google Search",
  "Referral from American Hospital",
]

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
  { field: "previousTherapy", label: "Have you ever been in therapy before?" },
]

const childrenYesNoQuestions = [
  { field: "schoolDifficulties", label: "Do you observe your child having any difficulties in school?" },
  { field: "socialSkillsDifficulties", label: "Any difficulty in social skills?" },
  { field: "behaviorDifficulties", label: "Any difficulty with behavior?" },
  { field: "anxietySigns", label: "Do you notice any signs of anxiety?" },
  { field: "eatingDifficulties", label: "Any difficulty eating? Sleeping?" },
  { field: "emotionalDifficulties", label: "Any agitation? Difficulty with managing emotions?" },
  { field: "enjoyedActivities", label: "Are there any activities he/she enjoys?" },
]

export default function OnboardingPage({ appointmentData, onSuccess }: OnboardingProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const appointmentId = searchParams.get("appointmentId")
  const [formData, setFormData] = useState<OnboardingFormData>({
    email: "",
    password: "",
    fullName: "",
    telephone: "",
    countryCode: "+971",
  })

  const [showCountryDropdown, setShowCountryDropdown] = useState(false)
  const [countrySearch, setCountrySearch] = useState("")
  const countryDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
        setShowCountryDropdown(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])



  const handleInputChange = (field: keyof OnboardingFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleCheckboxChange = (field: keyof OnboardingFormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: Array.isArray(prev[field])
        ? prev[field].includes(value)
          ? prev[field].filter((v) => v !== value)
          : [...prev[field], value]
        : [value],
    }))
  }

  const handleRadioChange = (field: keyof OnboardingFormData, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  // Function to handle phone number input - only allow numbers
  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // Only allow digits
    if (/^\d*$/.test(value)) {
      handleInputChange("telephone", value)
    }
  }

  const renderYesNoQuestion = (field: keyof OnboardingFormData, label: string) => (
    <div className={questionGroupStyles}>
      <Label className={`${labelStyles} block mb-3`}>{label}</Label>
      <RadioGroup
        value={formData[field]?.toString()}
        onValueChange={(value) => handleRadioChange(field, value === "true")}
        className="flex space-x-6"
      >
        <div className="flex items-center space-x-3">
          <RadioGroupItem
            value="true"
            id={`${field}-yes`}
            className="h-5 w-5 border-2 border-gray-300 data-[state=checked]:border-blue-600"
          />
          <Label htmlFor={`${field}-yes`} className={checkboxLabelStyles}>
            Yes
          </Label>
        </div>
        <div className="flex items-center space-x-3">
          <RadioGroupItem
            value="false"
            id={`${field}-no`}
            className="h-5 w-5 border-2 border-gray-300 data-[state=checked]:border-blue-600"
          />
          <Label htmlFor={`${field}-no`} className={checkboxLabelStyles}>
            No
          </Label>
        </div>
      </RadioGroup>
    </div>
  )

  const renderCheckboxSection = (title: string, options: string[], field: keyof OnboardingFormData) => (
    <div className={questionGroupStyles}>
      <Label className={`${labelStyles} block mb-3`}>{title}</Label>
      <div className="flex flex-col space-y-2">
        {options.map((option) => (
          <div key={option} className="flex items-center space-x-3">
            <Checkbox
              id={`${field}-${option}`}
              checked={Array.isArray(formData[field]) && formData[field].includes(option)}
              onCheckedChange={(checked: any) => {
                if (checked !== "indeterminate") {
                  handleCheckboxChange(field, option)
                }
              }}
              className="h-5 w-5 border-2 border-gray-300 rounded data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
            />
            <Label htmlFor={`${field}-${option}`} className={checkboxLabelStyles}>
              {option}
            </Label>
          </div>
        ))}
      </div>
    </div>
  )

  const renderChildrenQuestions = () => (
    <div className="space-y-6">
      <h2 className={sectionTitleStyles}>Children&apos;s Assessment</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="age" className={labelStyles}>
            Age
          </Label>
          <Input
            id="age"
            value={formData.age}
            onChange={(e) => handleInputChange("age", e.target.value)}
            className={inputStyles}
          />
        </div>
        <div>
          <Label htmlFor="schoolYear" className={labelStyles}>
            School Year
          </Label>
          <Input
            id="schoolYear"
            value={formData.schoolYear}
            onChange={(e) => handleInputChange("schoolYear", e.target.value)}
            className={inputStyles}
          />
        </div>
        <div>
          <Label htmlFor="gender" className={labelStyles}>
            Gender
          </Label>
          <Input
            id="gender"
            value={formData.gender}
            onChange={(e) => handleInputChange("gender", e.target.value)}
            className={inputStyles}
          />
        </div>
        <div>
          <Label htmlFor="livesWith" className={labelStyles}>
            Lives with
          </Label>
          <Input
            id="livesWith"
            value={formData.livesWith}
            onChange={(e) => handleInputChange("livesWith", e.target.value)}
            className={inputStyles}
          />
        </div>
      </div>

      <div className={questionGroupStyles}>
        <Label htmlFor="therapyReason" className={labelStyles}>
          What brings you to therapy?
        </Label>
        <Textarea
          id="therapyReason"
          value={formData.therapyReason}
          onChange={(e) => handleInputChange("therapyReason", e.target.value)}
          className={`${inputStyles} min-h-[100px]`}
        />
      </div>

      <div className={questionGroupStyles}>
        <Label htmlFor="professionalRecommendation" className={labelStyles}>
          Have you been recommended to seek therapy by a specific professional? (doctor, school, social worker)
        </Label>
        <Input
          id="professionalRecommendation"
          value={formData.professionalRecommendation}
          onChange={(e) => handleInputChange("professionalRecommendation", e.target.value)}
          className={inputStyles}
        />
      </div>

      {childrenYesNoQuestions.map(({ field, label }) => renderYesNoQuestion(field as keyof OnboardingFormData, label))}

      <div className={questionGroupStyles}>
        <Label htmlFor="healthIssues" className={labelStyles}>
          Are there any health issues that you believe are important for us to know?
        </Label>
        <Textarea
          id="healthIssues"
          value={formData.healthIssues}
          onChange={(e) => handleInputChange("healthIssues", e.target.value)}
          className={`${inputStyles} min-h-[100px]`}
        />
      </div>

      <div className={questionGroupStyles}>
        <Label htmlFor="previousChildTherapy" className={labelStyles}>
          Has your child been to therapy before?
        </Label>
        <Input
          id="previousChildTherapy"
          value={formData.previousChildTherapy}
          onChange={(e) => handleInputChange("previousChildTherapy", e.target.value)}
          className={inputStyles}
        />
      </div>
    </div>
  )

  const renderCouplesTherapyQuestions = () => (
    <div className="space-y-6">
      <h2 className={sectionTitleStyles}>Couples Assessment</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="age" className={labelStyles}>
            Your Age
          </Label>
          <Input
            id="age"
            value={formData.age}
            onChange={(e) => handleInputChange("age", e.target.value)}
            className={inputStyles}
          />
        </div>
        <div>
          <Label htmlFor="partnerAge" className={labelStyles}>
            Partner&apos;s Age
          </Label>
          <Input
            id="partnerAge"
            value={formData.partnerAge}
            onChange={(e) => handleInputChange("partnerAge", e.target.value)}
            className={inputStyles}
          />
        </div>
        <div>
          <Label htmlFor="gender" className={labelStyles}>
            Your Gender
          </Label>
          <RadioGroup
            value={formData.gender}
            onValueChange={(value) => handleInputChange("gender", value)}
            className="space-y-2"
          >
            {["Male", "Female"].map((gender) => (
              <div key={gender} className="flex items-center space-x-3">
                <RadioGroupItem value={gender} id={`gender-${gender}`} />
                <Label htmlFor={`gender-${gender}`}>{gender}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>
        <div>
          <Label htmlFor="partnerGender" className={labelStyles}>
            Partner&apos;s Gender
          </Label>
          <RadioGroup
            value={formData.partnerGender}
            onValueChange={(value) => handleInputChange("partnerGender", value)}
            className="space-y-2"
          >
            {["Male", "Female"].map((gender) => (
              <div key={gender} className="flex items-center space-x-3">
                <RadioGroupItem value={gender} id={`partnerGender-${gender}`} />
                <Label htmlFor={`partnerGender-${gender}`}>{gender}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>
        <div>
          <Label htmlFor="profession" className={labelStyles}>
            Your Profession
          </Label>
          <Input
            id="profession"
            value={formData.profession}
            onChange={(e) => handleInputChange("profession", e.target.value)}
            className={inputStyles}
          />
        </div>
        <div>
          <Label htmlFor="partnerProfession" className={labelStyles}>
            Partner&apos;s Profession
          </Label>
          <Input
            id="partnerProfession"
            value={formData.partnerProfession}
            onChange={(e) => handleInputChange("partnerProfession", e.target.value)}
            className={inputStyles}
          />
        </div>
      </div>

      <div className={questionGroupStyles}>
        <Label htmlFor="couplesTherapyReason" className={labelStyles}>
          What brings you to couples therapy?
        </Label>
        <Textarea
          id="couplesTherapyReason"
          value={formData.couplesTherapyReason}
          onChange={(e) => handleInputChange("couplesTherapyReason", e.target.value)}
          className={`${inputStyles} min-h-[100px]`}
        />
      </div>

      <div className={questionGroupStyles}>
        <Label htmlFor="issuesStartDate" className={labelStyles}>
          When did these issues begin? (months, years)
        </Label>
        <Input
          id="issuesStartDate"
          value={formData.issuesStartDate}
          onChange={(e) => handleInputChange("issuesStartDate", e.target.value)}
          className={inputStyles}
        />
      </div>

      <div className={questionGroupStyles}>
        <Label htmlFor="previousSolutions" className={labelStyles}>
          What have you tried previously to solve the issues?
        </Label>
        <Textarea
          id="previousSolutions"
          value={formData.previousSolutions}
          onChange={(e) => handleInputChange("previousSolutions", e.target.value)}
          className={`${inputStyles} min-h-[100px]`}
        />
      </div>

      <div className={questionGroupStyles}>
        <Label htmlFor="therapyExpectationsCouple" className={labelStyles}>
          What do you expect from this process?
        </Label>
        <Textarea
          id="therapyExpectationsCouple"
          value={formData.therapyExpectationsCouple}
          onChange={(e) => handleInputChange("therapyExpectationsCouple", e.target.value)}
          className={`${inputStyles} min-h-[100px]`}
        />
      </div>

      <div className={questionGroupStyles}>
        <Label htmlFor="healthIssuesCouple" className={labelStyles}>
          Are there any significant health and mental health issues that affect your dynamic as a couple?
        </Label>
        <Textarea
          id="healthIssuesCouple"
          value={formData.healthIssuesCouple}
          onChange={(e) => handleInputChange("healthIssuesCouple", e.target.value)}
          className={`${inputStyles} min-h-[100px]`}
        />
      </div>

      <div className={questionGroupStyles}>
        <Label htmlFor="currentTherapyStatus" className={labelStyles}>
          Are either or both of you already in therapy?
        </Label>
        <Input
          id="currentTherapyStatus"
          value={formData.currentTherapyStatus}
          onChange={(e) => handleInputChange("currentTherapyStatus", e.target.value)}
          className={inputStyles}
        />
      </div>
    </div>
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      // Format responses
      const responses = []

      // Add personal information responses
      responses.push(
        {
          questionId: "email",
          question: "Email",
          answer: formData.email || null,
          type: "text",
        },
        {
          questionId: "fullName",
          question: "Full Name",
          answer: formData.fullName || null,
          type: "text",
        },
        {
          questionId: "telephone",
          question: "Phone Number",
          answer: `${formData.countryCode} ${formData.telephone}` || null,
          type: "text",
        },
        {
          questionId: "ageGroup",
          question: "Age Group",
          answer: formData.ageGroup || null,
          type: "radio",
        },
      )

      // Add children therapy responses if therapy type is kids
      if (appointmentData?.therapyType?.toLowerCase().includes("kids")) {
        responses.push(
          {
            questionId: "age",
            question: "Child's Age",
            answer: formData.age || null,
            type: "text",
          },
          {
            questionId: "schoolYear",
            question: "School Year",
            answer: formData.schoolYear || null,
            type: "text",
          },
          {
            questionId: "livesWith",
            question: "Lives with",
            answer: formData.livesWith || null,
            type: "text",
          },
          {
            questionId: "therapyReason",
            question: "What brings you to therapy?",
            answer: formData.therapyReason || null,
            type: "text",
          },
          {
            questionId: "professionalRecommendation",
            question: "Professional recommendation",
            answer: formData.professionalRecommendation || null,
            type: "text",
          },
          ...childrenYesNoQuestions.map((q) => ({
            questionId: q.field,
            question: q.label,
            answer: formData[q.field as keyof OnboardingFormData] || false,
            type: "boolean",
          })),
          {
            questionId: "healthIssues",
            question: "Health issues",
            answer: formData.healthIssues || null,
            type: "text",
          },
          {
            questionId: "previousChildTherapy",
            question: "Previous therapy experience",
            answer: formData.previousChildTherapy || null,
            type: "text",
          },
        )
      }
      // Add couples therapy responses if therapy type is couples
      else if (appointmentData?.therapyType?.toLowerCase().includes("couples")) {
        responses.push(
          {
            questionId: "partnerAge",
            question: "Partner's Age",
            answer: formData.partnerAge || null,
            type: "text",
          },
          {
            questionId: "partnerGender",
            question: "Partner's Gender",
            answer: formData.partnerGender || null,
            type: "text",
          },
          {
            questionId: "profession",
            question: "Your Profession",
            answer: formData.profession || null,
            type: "text",
          },
          {
            questionId: "partnerProfession",
            question: "Partner's Profession",
            answer: formData.partnerProfession || null,
            type: "text",
          },
          {
            questionId: "couplesTherapyReason",
            question: "Reason for couples therapy",
            answer: formData.couplesTherapyReason || null,
            type: "text",
          },
          {
            questionId: "issuesStartDate",
            question: "When issues began",
            answer: formData.issuesStartDate || null,
            type: "text",
          },
          {
            questionId: "previousSolutions",
            question: "Previous solutions tried",
            answer: formData.previousSolutions || null,
            type: "text",
          },
          {
            questionId: "therapyExpectationsCouple",
            question: "Expectations from therapy",
            answer: formData.therapyExpectationsCouple || null,
            type: "text",
          },
          {
            questionId: "healthIssuesCouple",
            question: "Health issues affecting relationship",
            answer: formData.healthIssuesCouple || null,
            type: "text",
          },
          {
            questionId: "currentTherapyStatus",
            question: "Current therapy status",
            answer: formData.currentTherapyStatus || null,
            type: "text",
          },
        )
      }
      // Default case - add all standard questions
      else {
        responses.push(
          {
            questionId: "troublingConcerns",
            question: "What has been troubling you?",
            answer: formData.troublingConcerns || null,
            type: "text",
          },
          {
            questionId: "therapyExpectations",
            question: "What are you expecting from therapy?",
            answer: formData.therapyExpectations || null,
            type: "text",
          },
          {
            questionId: "concernsDuration",
            question: "How long have you been experiencing these concerns?",
            answer: formData.concernsDuration || null,
            type: "radio",
          },
          {
            questionId: "affectedAreas",
            question: "What areas of your life are affected by these concerns?",
            answer: formData.affectedAreas || [],
            type: "checkbox",
          },
          {
            questionId: "negativeEmotions",
            question: "What feelings is this concern associated with?",
            answer: formData.negativeEmotions || [],
            type: "checkbox",
          },
          {
            questionId: "positiveEmotions",
            question: "What positive feeling is this concern associated with?",
            answer: formData.positiveEmotions || [],
            type: "checkbox",
          },
          ...yesNoQuestions.map((q) => ({
            questionId: q.field,
            question: q.label,
            answer: formData[q.field as keyof OnboardingFormData] || false,
            type: "boolean",
          })),
          {
            questionId: "trustFactors",
            question: "What factors influenced your decision to trust iCarewellbeing?",
            answer: formData.trustFactors || [],
            type: "checkbox",
          },
          {
            questionId: "availability",
            question: "Availability considerations",
            answer: formData.availability || [],
            type: "checkbox",
          },
          {
            questionId: "therapistGenderPreference",
            question: "Therapist gender preference",
            answer: formData.therapistGenderPreference || null,
            type: "radio",
          },
          {
            questionId: "communicationLanguage",
            question: "Communication language preference",
            answer: formData.communicationLanguage || [],
            type: "checkbox",
          },
          {
            questionId: "referralSource",
            question: "Referral source",
            answer: formData.referralSource || null,
            type: "radio",
          },
        )
      }
      if (!formData.email || !formData.password || !formData.fullName || !formData.telephone) {
        throw new Error("Please fill in all required fields")
      }

      // Send registration data
      const response = await fetch("/api/patient/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email.toLowerCase(),
          password: formData.password,
          fullName: formData.fullName,
          telephone: `${formData.countryCode} ${formData.telephone}`,
          responses: responses,
          appointmentData
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to complete registration")
      }

      const data = await response.json()

      // On success, store credentials temporarily and redirect to checkout
      if (data.data.appointmentId) {
        // Store credentials temporarily for auto sign-in
        localStorage.setItem('temp_user_email', formData.email.toLowerCase());
        localStorage.setItem('temp_user_password', formData.password);
        // Redirect directly to checkout - instant, no loading
        window.location.href = `/payment?appointmentId=${data.data.appointmentId}`;
      }
    } catch (error: any) {
      console.error("Registration error:", error)
      toast.error(error.message || "Failed to complete registration")
    }
  }


  return (
    <Suspense fallback={<Spin />}>
      <div className="min-h-screen bg-gray-50 py-4 sm:px-4 lg:px-8 bg-onbording">
        <div className="max-w-3xl mx-auto">
          <Card className="sm:p-8 p-1 bg-white bg-onbording">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div>
              <h1 className={sectionTitleStyles}>Personal Information</h1>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      className="bg-white border-gray-300 text-black placeholder-gray-400 bg-onbording"
                      placeholder="Enter your email"
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      minLength={6}
                      value={formData.password}
                      onChange={(e) => handleInputChange("password", e.target.value)}
                      className="bg-white border-gray-300 text-black placeholder-gray-400 bg-onbording"
                    />
                  </div>
                  <div>
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={formData.fullName}
                      onChange={(e) => handleInputChange("fullName", e.target.value)}
                      className="bg-white border-gray-300 text-black placeholder-gray-400 bg-onbording"
                      placeholder="Enter your full name"
                    />
                  </div>
                  {/* Replace the phone number input section with this improved version */}
                  <div>
                    <Label htmlFor="telephone">Phone Number</Label>
                    <div className="flex bg-onbording">
                      <div className="relative w-[90px] mr-2" ref={countryDropdownRef}>
                        <div
                          className="border border-gray-300 rounded-md px-2 py-2 text-black bg-onbording cursor-pointer flex items-center justify-between"
                          onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                        >
                          <span>{formData.countryCode}</span>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 text-gray-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                        {showCountryDropdown && (
                          <div className="absolute z-10 w-[200px] mt-1 max-h-60 overflow-auto bg-white border border-gray-300 rounded-md shadow-lg">
                            <div className="sticky top-0 bg-white border-b border-gray-200">
                              <Input
                                value={countrySearch}
                                onChange={(e) => setCountrySearch(e.target.value)}
                                placeholder="Search..."
                                className="border-0 focus:ring-0"
                              />
                            </div>
                            {countryCodes
                              .filter(
                                (country) =>
                                  country.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
                                  country.code.includes(countrySearch),
                              )
                              .map((country) => (
                                <div
                                  key={`${country.code}-${country.name}`}
                                  className="px-4 py-2 cursor-pointer hover:bg-gray-100 flex justify-between"
                                  onClick={() => {
                                    handleInputChange("countryCode", country.code)
                                    setShowCountryDropdown(false)
                                    setCountrySearch("")
                                  }}
                                >
                                  <span>{country.name}</span>
                                  <span className="text-gray-600">{country.code}</span>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                      <Input
                        id="telephone"
                        required
                        value={formData.telephone}
                        onChange={handlePhoneNumberChange}
                        className="border-gray-300 text-black placeholder-gray-400 bg-onbording flex-1"
                        placeholder="Enter your phone number"
                        inputMode="numeric"
                        pattern="[0-9]*"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div>

                  <div className="space-y-6">
                    {/* Show questions based on therapy type */}
                    {appointmentData?.therapyType?.toLowerCase().includes("kids") ? (
                      renderChildrenQuestions()
                    ) : appointmentData?.therapyType?.toLowerCase().includes("couples") ? (
                      /* Couples therapy questions - only shown when therapy type is couples */
                      renderCouplesTherapyQuestions()
                    ) : appointmentData?.therapyType?.toLowerCase().includes("psychiatry") ? (
                      // here add new questions
                      <>
                      <div className={"w-full"}>
                          <Label htmlFor="psychiatryAge" className={labelStyles}>
                            Age:
                          </Label>
                          <Textarea
                            id="psychiatryAge"
                            value={formData.psychiatryAge}
                            onChange={(e) => handleInputChange("psychiatryAge", e.target.value)}
                            className="border-gray-300 text-black placeholder-gray-400 min-h-[100px] bg-onbording"
                            placeholder="Please describe your concerns..."
                          />
                        </div>
                        <div className={"w-full"}>
                          <Label htmlFor="psychiatryGender" className={labelStyles}>
                            Gender:
                          </Label>
                          <Textarea
                            id="psychiatryGender"
                            value={formData.psychiatryGender}
                            onChange={(e) => handleInputChange("psychiatryGender", e.target.value)}
                            className="border-gray-300 text-black placeholder-gray-400 min-h-[100px] bg-onbording"
                            placeholder="Please describe your expectations..."
                          />
                        </div>
                        <div className={"w-full"}>
                          <Label htmlFor="psychiatryProfession" className={labelStyles}>
                            Profession:
                          </Label>
                          <Textarea
                            id="psychiatryProfession"
                            value={formData.psychiatryProfession}
                            onChange={(e) => handleInputChange("psychiatryProfession", e.target.value)}
                            className="border-gray-300 text-black placeholder-gray-400 min-h-[100px] bg-onbording"
                            placeholder="Please describe your expectations..."
                          />
                        </div>
                        <div className={"w-full"}>
                          <Label htmlFor="psychiatryReason" className={labelStyles}>
                            What brings you to a psychiatrist?:
                          </Label>
                          <Textarea
                            id="psychiatryReason"
                            value={formData.psychiatryReason}
                            onChange={(e) => handleInputChange("psychiatryReason", e.target.value)}
                            className="border-gray-300 text-black placeholder-gray-400 min-h-[100px] bg-onbording"
                            placeholder="Please describe your expectations..."
                          />
                        </div>
                        <div className={"w-full"}>
                          <Label htmlFor="psychiatrySymptomsDuration" className={labelStyles}>
                            How long have you experienced these symptoms?:
                          </Label>
                          <Textarea
                            id="psychiatrySymptomsDuration"
                            value={formData.psychiatrySymptomsDuration}
                            onChange={(e) => handleInputChange("psychiatrySymptomsDuration", e.target.value)}
                            className="border-gray-300 text-black placeholder-gray-400 min-h-[100px] bg-onbording"
                            placeholder="Please describe your expectations..."
                          />
                        </div>
                        <div className={"w-full"}>
                          <Label htmlFor="psychiatryPreviousDiagnoses" className={labelStyles}>
                            Do you have any previous health or mental health diagnoses?:
                          </Label>
                          <Textarea
                            id="psychiatryPreviousDiagnoses"
                            value={formData.psychiatryPreviousDiagnoses}
                            onChange={(e) => handleInputChange("psychiatryPreviousDiagnoses", e.target.value)}
                            className="border-gray-300 text-black placeholder-gray-400 min-h-[100px] bg-onbording"
                            placeholder="Please describe your expectations..."
                          />
                        </div>
                        <div className={"w-full"}>
                          <Label htmlFor="psychiatryPreviousAppointment" className={labelStyles}>
                            Have you been to a psychiatry appointment before?:
                          </Label>
                          <Textarea
                            id="psychiatryPreviousAppointment"
                            value={formData.psychiatryPreviousAppointment}
                            onChange={(e) => handleInputChange("psychiatryPreviousAppointment", e.target.value)}
                            className="border-gray-300 text-black placeholder-gray-400 min-h-[100px] bg-onbording"
                            placeholder="Please describe your expectations..."
                          />
                        </div>
                        <div className={"w-full"}>
                          <Label htmlFor="psychiatryLivingArrangement" className={labelStyles}>
                            Do you live alone or with someone?:
                          </Label>
                          <Textarea
                            id="psychiatryLivingArrangement"
                            value={formData.psychiatryLivingArrangement}
                            onChange={(e) => handleInputChange("psychiatryLivingArrangement", e.target.value)}
                            className="border-gray-300 text-black placeholder-gray-400 min-h-[100px] bg-onbording"
                            placeholder="Please describe your expectations..."
                          />
                        </div>
                        <div className={"w-full"}>
                          <Label htmlFor="psychiatryAnxietyStressMood" className={labelStyles}>
                            Do you have trouble with anxiety, stress and/or your mood?:
                          </Label>
                          <Textarea
                            id="psychiatryAnxietyStressMood"
                            value={formData.psychiatryAnxietyStressMood}
                            onChange={(e) => handleInputChange("psychiatryAnxietyStressMood", e.target.value)}
                            className="border-gray-300 text-black placeholder-gray-400 min-h-[100px] bg-onbording"
                            placeholder="Please describe your expectations..."
                          />
                        </div>
                        <div className={"w-full"}>
                          <Label htmlFor="psychiatryIntrusiveThoughts" className={labelStyles}>
                            Do you have thoughts that bother you and you cannot control?:
                          </Label>
                          <Textarea
                            id="psychiatryIntrusiveThoughts"
                            value={formData.psychiatryIntrusiveThoughts}
                            onChange={(e) => handleInputChange("psychiatryIntrusiveThoughts", e.target.value)}
                            className="border-gray-300 text-black placeholder-gray-400 min-h-[100px] bg-onbording"
                            placeholder="Please describe your expectations..."
                          />
                        </div>
                        <div className={"w-full"}>
                          <Label htmlFor="psychiatrySleepAppetiteChanges" className={labelStyles}>
                            Do you recognize any changes in sleep and/or appetite?:
                          </Label>
                          <Textarea
                            id="psychiatrySleepAppetiteChanges"
                            value={formData.psychiatrySleepAppetiteChanges}
                            onChange={(e) => handleInputChange("psychiatrySleepAppetiteChanges", e.target.value)}
                            className="border-gray-300 text-black placeholder-gray-400 min-h-[100px] bg-onbording"
                            placeholder="Please describe your expectations..."
                          />
                        </div>
                        <div className={"w-full"}>
                          <Label htmlFor="psychiatryRiskToSelfOrOthers" className={labelStyles}>
                            Do you believe you currently pose a risk to yourself or others?:
                          </Label>
                          <Textarea
                            id="psychiatryRiskToSelfOrOthers"
                            value={formData.psychiatryRiskToSelfOrOthers}
                            onChange={(e) => handleInputChange("psychiatryRiskToSelfOrOthers", e.target.value)}
                            className="border-gray-300 text-black placeholder-gray-400 min-h-[100px] bg-onbording"
                            placeholder="Please describe your expectations..."
                          />
                        </div>
                        <div className={"w-full"}>
                          <Label htmlFor="psychiatryDailyActivities" className={labelStyles}>
                            Do your symptoms keep you from performing daily activities? (work, basic hygiene, social life, groceries, cooking, cleaning):
                          </Label>
                          <Textarea
                            id="psychiatryDailyActivities"
                            value={formData.psychiatryDailyActivities}
                            onChange={(e) => handleInputChange("psychiatryDailyActivities", e.target.value)}
                            className="border-gray-300 text-black placeholder-gray-400 min-h-[100px] bg-onbording"
                            placeholder="Please describe your expectations..."
                          />
                        </div>
                        <div className={"w-full"}>
                          <Label htmlFor="psychiatryExpectations" className={labelStyles}>
                            Do you have any expectations for this appointment?:
                          </Label>
                          <Textarea
                            id="psychiatryExpectations"
                            value={formData.psychiatryExpectations}
                            onChange={(e) => handleInputChange("psychiatryExpectations", e.target.value)}
                            className="border-gray-300 text-black placeholder-gray-400 min-h-[100px] bg-onbording"
                            placeholder="Please describe your expectations..."
                          />
                        </div>
                      </>
                    ) : (
                      /* Default case - show all standard questions */
                      <>
                         {/* Age group selection is always shown */}
                  <h2 className={sectionTitleStyles}>Concerns</h2>
                  <p className="text-gray-600 mb-6">
                    This form usually takes 2 minutes to fill. This information helps us to match you to the perfect
                    therapist. Feel free to skip if you prefer.
                  </p>
                    <div className={questionGroupStyles}>
                      <Label className={`${labelStyles} block mb-3`}>How old are you?</Label>
                      <RadioGroup
                        value={formData.ageGroup}
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
                            <Label htmlFor={`age-${age}`} className={checkboxLabelStyles}>
                              {age}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                        <div className={"w-full"}>
                          <Label htmlFor="troublingConcerns" className={labelStyles}>
                            What has been troubling you in the present that would be an objective to work in your
                            sessions?
                          </Label>
                          <Textarea
                            id="troublingConcerns"
                            value={formData.troublingConcerns}
                            onChange={(e) => handleInputChange("troublingConcerns", e.target.value)}
                            className="border-gray-300 text-black placeholder-gray-400 min-h-[100px] bg-onbording"
                            placeholder="Please describe your concerns..."
                          />
                        </div>

                        <div className={"w-full"}>
                          <Label htmlFor="therapyExpectations" className={labelStyles}>
                            What are you expecting from therapy?
                          </Label>
                          <Textarea
                            id="therapyExpectations"
                            value={formData.therapyExpectations}
                            onChange={(e) => handleInputChange("therapyExpectations", e.target.value)}
                            className="border-gray-300 text-black placeholder-gray-400 min-h-[100px] bg-onbording"
                            placeholder="Please describe your expectations..."
                          />
                        </div>

                        <div className={questionGroupStyles}>
                          <Label className={`${labelStyles} block mb-3`}>
                            How long have you been experiencing these concerns?
                          </Label>
                          <RadioGroup
                            value={formData.concernsDuration}
                            onValueChange={(value) => handleInputChange("concernsDuration", value)}
                            className="space-y-3"
                          >
                            {["Less than 6 months", "6 months to 1 year", "1-2 years", "More than 2 years"].map(
                              (option) => (
                                <div key={option} className="flex items-center space-x-3">
                                  <RadioGroupItem
                                    value={option}
                                    id={option}
                                    className="h-5 w-5 border-2 border-gray-300 data-[state=checked]:border-blue-600"
                                  />
                                  <Label htmlFor={option} className={checkboxLabelStyles}>
                                    {option}
                                  </Label>
                                </div>
                              ),
                            )}
                          </RadioGroup>
                        </div>

                        {renderCheckboxSection(
                          "What areas of your life are affected by these concerns?",
                          AFFECTED_AREAS,
                          "affectedAreas",
                        )}

                        {renderCheckboxSection(
                          "What feelings is this concern associated with?",
                          NEGATIVE_EMOTIONS,
                          "negativeEmotions",
                          )}

                        {renderCheckboxSection(
                          "What positive feeling is this concern associated with?",
                          POSITIVE_EMOTIONS,
                          "positiveEmotions",
                        )}

                        <h2 className={sectionTitleStyles}>Mental Health Indicators</h2>

                        {yesNoQuestions.map(({ field, label }) =>
                          renderYesNoQuestion(field as keyof OnboardingFormData, label),
                        )}

                        <h2 className={sectionTitleStyles}>Decision Factor</h2>

                        {renderCheckboxSection(
                          "What factors influenced your decision to trust iCarewellbeing as a reliable option for matching you with the right therapist?",
                          TRUST_FACTORS,
                          "trustFactors",
                        )}

                        <h2 className={sectionTitleStyles}>Therapist Preferences</h2>

                        {renderCheckboxSection(
                          "For your ongoing therapeutic sessions, please indicate your availability considerations:",
                          AVAILABILITY,
                          "availability",
                        )}

                        <div className={questionGroupStyles}>
                          <Label className={`${labelStyles} block mb-3`}>
                            Do you have a preference for the therapist&apos;s gender?
                          </Label>
                          <RadioGroup
                            value={formData.therapistGenderPreference}
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
                                <Label htmlFor={`therapist-gender-${gender}`} className={checkboxLabelStyles}>
                                  {gender}
                                </Label>
                              </div>
                            ))}
                          </RadioGroup>
                        </div>

                        {renderCheckboxSection(
                          "Language of preference for communication with your therapist:",
                          LANGUAGES,
                          "communicationLanguage",
                        )}

                        <div className={questionGroupStyles}>
                          <Label className={`${labelStyles} block mb-3`}>How did you hear about iCarewellbeing?</Label>
                          <RadioGroup
                            value={formData.referralSource}
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
                                <Label htmlFor={`referral-${source}`} className={checkboxLabelStyles}>
                                  {source}
                                </Label>
                              </div>
                            ))}
                          </RadioGroup>
                        </div>
                      </>
                    )}

                    <div className="bg-blue-50 p-6 rounded-lg border border-blue-200 mt-8">
                      <p className="text-blue-900 mb-4">
                        We highly value your privacy and the information you&apos;ve shared with us. Your responses are
                        confidential and will be handled with the utmost care. They will only be used for the purpose of
                        matching you with an appropriate qualified therapist.
                      </p>
                      <p className="text-blue-900 mt-4 font-medium">
                        By proceeding, you consent that the provided information in this form is accurate and completed
                        to the best of your knowledge.
                      </p>
                    </div>

                    <div className="pt-6">
                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5"
                >
                  Create Account
                </Button>
              </div>
                  </div>
                </div>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </Suspense>
  )
}
