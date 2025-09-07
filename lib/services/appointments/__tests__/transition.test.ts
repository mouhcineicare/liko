import { transitionAppointment, isTransitionAllowed, getAllowedTransitions } from "../transition";
import { APPOINTMENT_STATUSES } from "@/lib/utils/statusMapping";

// Mock the dependencies
jest.mock("@/lib/db/models/Appointment");
jest.mock("../history");
jest.mock("../../events/dispatcher");

describe("Appointment Transition System", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Transition Rules", () => {
    test("UNPAID → PENDING should be allowed", () => {
      expect(isTransitionAllowed(APPOINTMENT_STATUSES.UNPAID, APPOINTMENT_STATUSES.PENDING)).toBe(true);
    });

    test("PENDING → PENDING_MATCH should be allowed", () => {
      expect(isTransitionAllowed(APPOINTMENT_STATUSES.PENDING, APPOINTMENT_STATUSES.PENDING_MATCH)).toBe(true);
    });

    test("PENDING_MATCH → MATCHED_PENDING_THERAPIST_ACCEPTANCE should be allowed", () => {
      expect(isTransitionAllowed(APPOINTMENT_STATUSES.PENDING_MATCH, APPOINTMENT_STATUSES.MATCHED_PENDING_THERAPIST_ACCEPTANCE)).toBe(true);
    });

    test("CONFIRMED → COMPLETED should be allowed", () => {
      expect(isTransitionAllowed(APPOINTMENT_STATUSES.CONFIRMED, APPOINTMENT_STATUSES.COMPLETED)).toBe(true);
    });

    test("COMPLETED → CONFIRMED should be forbidden", () => {
      expect(isTransitionAllowed(APPOINTMENT_STATUSES.COMPLETED, APPOINTMENT_STATUSES.CONFIRMED)).toBe(false);
    });

    test("UNPAID → COMPLETED should be forbidden", () => {
      expect(isTransitionAllowed(APPOINTMENT_STATUSES.UNPAID, APPOINTMENT_STATUSES.COMPLETED)).toBe(false);
    });
  });

  describe("Allowed Transitions", () => {
    test("UNPAID should allow only PENDING", () => {
      const allowed = getAllowedTransitions(APPOINTMENT_STATUSES.UNPAID);
      expect(allowed).toEqual([APPOINTMENT_STATUSES.PENDING]);
    });

    test("PENDING should allow PENDING_MATCH and UNPAID", () => {
      const allowed = getAllowedTransitions(APPOINTMENT_STATUSES.PENDING);
      expect(allowed).toContain(APPOINTMENT_STATUSES.PENDING_MATCH);
      expect(allowed).toContain(APPOINTMENT_STATUSES.UNPAID);
    });

    test("CONFIRMED should allow multiple transitions", () => {
      const allowed = getAllowedTransitions(APPOINTMENT_STATUSES.CONFIRMED);
      expect(allowed).toContain(APPOINTMENT_STATUSES.COMPLETED);
      expect(allowed).toContain(APPOINTMENT_STATUSES.CANCELLED);
      expect(allowed).toContain(APPOINTMENT_STATUSES.NO_SHOW);
    });

    test("Terminal statuses should allow no transitions", () => {
      expect(getAllowedTransitions(APPOINTMENT_STATUSES.COMPLETED)).toEqual([]);
      expect(getAllowedTransitions(APPOINTMENT_STATUSES.CANCELLED)).toEqual([]);
      expect(getAllowedTransitions(APPOINTMENT_STATUSES.NO_SHOW)).toEqual([]);
    });
  });

  describe("Legacy Status Mapping", () => {
    test("Legacy 'pending' should map to PENDING", () => {
      expect(isTransitionAllowed('pending', APPOINTMENT_STATUSES.PENDING_MATCH)).toBe(true);
    });

    test("Legacy 'approved' should map to CONFIRMED", () => {
      expect(isTransitionAllowed('approved', APPOINTMENT_STATUSES.COMPLETED)).toBe(true);
    });

    test("Legacy 'rejected' should map to CANCELLED", () => {
      expect(isTransitionAllowed('rejected', APPOINTMENT_STATUSES.CANCELLED)).toBe(false); // Terminal status
    });
  });

  describe("Business Rules", () => {
    test("Should require therapist for PENDING_SCHEDULING", async () => {
      const mockAppointment = {
        _id: "test-id",
        status: APPOINTMENT_STATUSES.MATCHED_PENDING_THERAPIST_ACCEPTANCE,
        therapist: null,
        save: jest.fn()
      };

      const Appointment = require("@/lib/db/models/Appointment").default;
      Appointment.findById = jest.fn().mockResolvedValue(mockAppointment);

      await expect(
        transitionAppointment(
          "test-id",
          APPOINTMENT_STATUSES.PENDING_SCHEDULING,
          { id: "actor-id", role: "admin" }
        )
      ).rejects.toThrow("Cannot schedule without therapist assigned");
    });

    test("Should require date for CONFIRMED", async () => {
      const mockAppointment = {
        _id: "test-id",
        status: APPOINTMENT_STATUSES.PENDING_SCHEDULING,
        therapist: "therapist-id",
        date: null,
        save: jest.fn()
      };

      const Appointment = require("@/lib/db/models/Appointment").default;
      Appointment.findById = jest.fn().mockResolvedValue(mockAppointment);

      await expect(
        transitionAppointment(
          "test-id",
          APPOINTMENT_STATUSES.CONFIRMED,
          { id: "actor-id", role: "admin" }
        )
      ).rejects.toThrow("Cannot confirm without a scheduled date/time");
    });

    test("Should require completed payment for PENDING_MATCH", async () => {
      const mockAppointment = {
        _id: "test-id",
        status: APPOINTMENT_STATUSES.PENDING,
        paymentStatus: "pending",
        save: jest.fn()
      };

      const Appointment = require("@/lib/db/models/Appointment").default;
      Appointment.findById = jest.fn().mockResolvedValue(mockAppointment);

      await expect(
        transitionAppointment(
          "test-id",
          APPOINTMENT_STATUSES.PENDING_MATCH,
          { id: "actor-id", role: "admin" }
        )
      ).rejects.toThrow("Cannot proceed to matching without completed payment");
    });
  });
});
