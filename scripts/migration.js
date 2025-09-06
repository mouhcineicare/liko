"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var mongoose_1 = require("mongoose");
var connect_1 = require("../lib/db/connect");
var Appointment_1 = require("../lib/db/models/Appointment"); // Adjust path if needed
function isSplitDateObject(obj) {
    if (!obj || typeof obj !== 'object') return false;
    const keys = Object.keys(obj).filter(k => !['status', 'payment', '_id', 'date'].includes(k));
    if (keys.length < 8) return false;
    return keys.every(k => !isNaN(Number(k)) && typeof obj[k] === 'string' && obj[k].length === 1);
}
function convertSplitDateToNewEntry(entry) {
    // Only keep status, payment, _id, and set date to now
    const { status, payment, _id } = entry;
    return {
        date: new Date().toISOString(),
        ...(status && { status }),
        ...(payment && { payment }),
        ...(_id && { _id })
    };
}
function migrateRecurringFormat() {
    return __awaiter(this, void 0, void 0, function () {
        var appointments, updatedCount, _i, appointments_1, appt, changed;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, connect_1["default"])()];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, Appointment_1["default"].find()];
                case 2:
                    appointments = _a.sent();
                    console.log('Found appointments:', appointments.length);
                    appointments.forEach(function (appt, idx) {
                        console.log("Appointment #".concat(idx + 1, ":"), appt._id, appt.recurring);
                    });
                    updatedCount = 0;
                    _i = 0, appointments_1 = appointments;
                    _a.label = 3;
                case 3:
                    if (!(_i < appointments_1.length)) return [3 /*break*/, 6];
                    appt = appointments_1[_i];
                    changed = false;
                    if (Array.isArray(appt.recurring)) {
                        let newRecurring = [];
                        appt.recurring.forEach(function (entry) {
                            if (isSplitDateObject(entry)) {
                                // Keep the original split object
                                newRecurring.push(entry);
                                // Add a new correct entry
                                newRecurring.push(convertSplitDateToNewEntry(entry));
                                changed = true;
                            }
                            else if (entry && typeof entry === 'object' && entry.date && isSplitDateObject(entry.date)) {
                                // Keep the original
                                newRecurring.push(entry);
                                // Add a new correct entry
                                newRecurring.push(Object.assign({}, entry, { date: new Date().toISOString() }));
                                changed = true;
                            }
                            else if (typeof entry === 'string') {
                                newRecurring.push({ date: entry });
                                changed = true;
                            }
                            else {
                                newRecurring.push(entry);
                            }
                        });
                        appt.recurring = newRecurring;
                    }
                    if (changed) {
                        return [4 /*yield*/, appt.save()];
                    }
                    return [3 /*break*/, 5];
                case 4:
                    _a.sent();
                    updatedCount++;
                    _a.label = 5;
                case 5:
                    _i++;
                    return [3 /*break*/, 3];
                case 6:
                    console.log("Updated ".concat(updatedCount, " appointments to new recurring format."));
                    return [4 /*yield*/, mongoose_1["default"].disconnect()];
                case 7:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
migrateRecurringFormat()["catch"](function (e) {
    console.error(e);
    process.exit(1);
});
