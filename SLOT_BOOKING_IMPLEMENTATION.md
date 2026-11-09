# Slot Management & Consultation Booking System - Architecture & Implementation

## 1. Concurrency Control & Double-Booking Prevention (Production Feature)

To prevent race conditions where two clients simultaneously attempt to book the exact same lawyer slot (Time-of-Check to Time-of-Use / TOCTOU vulnerability), LawConnect employs **Atomic Compare-and-Swap (CAS)** via MongoDB's document-level locking.

### A. The Concurrency Problem (Race Condition)
In traditional naive implementations:
```
Client A: Check if slot is available (true) ───────► Creates Booking A
Client B: Check if slot is available (true) ───────► Creates Booking B (DOUBLE BOOKING BUG!)
```

### B. The Atomic Solution (`backend/src/controllers/bookingController.js`)
LawConnect executes an atomic mutation at the database engine level:
```javascript
const lockedLawyer = await Lawyer.findOneAndUpdate(
  {
    _id: lawyerId,
    "consultationSlots._id": slotId,
    "consultationSlots.isBooked": false,
    "consultationSlots.status": { $ne: "booked" }
  },
  {
    $set: {
      "consultationSlots.$.isBooked": true,
      "consultationSlots.$.status": "booked",
      "consultationSlots.$.clientId": req.user._id
    }
  },
  { new: true }
);

if (!lockedLawyer) {
  return res.status(409).json({
    message: "This consultation slot was just acquired by another client. Please select an alternate slot.",
    code: "SLOT_CONFLICT_RACE_PREVENTED"
  });
}
```

### C. Automatic Rollback Protection
If the subsequent `Booking.create(...)` call fails (e.g. database schema validation or transient network error), an automatic rollback reverts the slot reservation:
```javascript
catch (creationError) {
  await Lawyer.updateOne(
    { _id: lawyerId, "consultationSlots._id": slotId },
    { $set: { "consultationSlots.$.isBooked": false, "consultationSlots.$.status": "available", "consultationSlots.$.clientId": null } }
  );
  throw creationError;
}
```

---

## 2. Core Booking Components

### 1. **Default Slot Generation** (`slotUtils.js`)
- Generates slots with standard 40-minute consultation intervals.
- Utility functions for 12-hour time conversion, date formatting, and past-date validation.

### 2. **Enhanced Lawyer Dashboard** (`LawyerDashboard.jsx`)
- Real-time slot management (Add, Delete, Generate 11 AM - 2 PM batches).
- Visual status indicators (`booked` vs `available`).
- Live updates via Socket.io `lawyer_slots_updated` events.

### 3. **Consultation Booking Dialog** (`ConsultationBookingDialog.jsx`)
- Interactive date calendar and slot selector.
- Notes field with optional case details.

### 4. **Case Booking Dialog** (`CaseBookingDialog.jsx`)
- Transition from preliminary consultation to an official case file once consultation is completed.

---

## 3. Interview Talking Points

1. **Why Atomic `findOneAndUpdate`?**
   > *"Rather than relying on distributed locks (like Redis Redlock) for a single database cluster, MongoDB's document-level write locks guarantee that concurrent updates on the same subdocument are serialized. Exactly one update matches `isBooked: false`, preventing any possibility of double booking."*
2. **State Synchronization:**
   > *"Immediately upon successful booking, `emitLawyerSlotsUpdated` pushes live Socket.io events to all active client tabs, preventing other users from clicking stale slots."*
