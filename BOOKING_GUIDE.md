# LawConnect Consultation & Case Booking System

## Overview

The new slot management and booking system enables lawyers to manage their availability and clients to easily book consultations and hire lawyers for cases.

## System Features

### 1. Default Slots (11 AM - 2 PM)
- **Duration**: Each slot is 40 minutes
- **Default Time Range**: 11 AM to 2 PM generates 4 available slots:
  - 11:00 AM - 11:40 AM
  - 11:40 AM - 12:20 PM
  - 12:20 PM - 1:00 PM
  - 1:00 PM - 1:40 PM
  - 1:40 PM - 2:00 PM (20 mins)

## Lawyer Workflow

### Setting Up Slots

**For First Time:**
1. Navigate to **Lawyer Dashboard** → **Manage Slots** tab
2. Click **"Generate (11 AM-2 PM)"** button
3. System generates default slots for tomorrow
4. Each slot is 40 minutes and available for booking

**Manual Slot Creation:**
1. Go to **Manage Slots** tab
2. Fill in:
   - **Date**: Select date (min today)
   - **Start Time**: When consultation starts
   - **End Time**: When consultation ends
3. Click **"Add Slot"**
4. View all slots in the right panel

### Editing Slots
1. Click **"Edit"** button on any available slot
2. Update date/time in the form
3. Click **"Update Slot"**

### Deleting Slots
- Click **"Delete"** button on any slot
- Can only delete **unbooked** slots
- Booked slots show as locked

### Managing Bookings
1. Go to **Bookings** tab
2. See all consultation requests
3. Accept or Decline pending bookings
4. Mark completed consultations

### Slot Status
- **Available** (Green): Open for booking
- **Booked** (Blue): Slot is reserved, cannot be edited/deleted

## Client Workflow

### Booking a Consultation

**Step 1: Navigate to Lawyer Profile**
1. Search for a lawyer
2. Click their profile
3. Click **"Book Consultation"** button

**Step 2: Calendar Date Selection**
- A calendar view appears showing available dates
- Each date shows number of available slots
- Click on a date to proceed

**Step 3: Select Time Slot**
- See all available slots for selected date
- Each slot shows:
  - Start and end time (12-hour format)
  - Duration (40 minutes)
- Click to select a slot (highlighted in blue)

**Step 4: Add Notes (Optional)**
- Add details about your legal concern
- Helps lawyer prepare for consultation
- e.g., "Need advice on property dispute"

**Step 5: Confirm Booking**
- Review summary showing date & time
- Click **"Confirm Booking"**
- Receive confirmation immediately

### Booking Status Flow

```
NEW BOOKING
    ↓
CLIENT BOOKS → Status: "pending"
    ↓
LAWYER REVIEWS → Confirm/Decline
    ↓
IF CONFIRMED → Status: "confirmed"
    ↓
AFTER CONSULTATION → Marked "completed"
    ↓
REVIEW & CASE BOOKING OPTION
```

### After Consultation

Once a consultation is completed and confirmed:

1. **Leave a Review** (Optional)
   - Rate lawyer (1-5 stars)
   - Write feedback
   - Helps build lawyer's reputation

2. **Book for a Case** (Optional)
   - Click **"Book for a Case"** button
   - Dialog opens asking for:
     - **Case Title**: Type of case (e.g., "Property Dispute")
     - **Case Description**: Details about your case
   - Choose to:
     - Just keep consultation only
     - Book lawyer for full case representation

### Creating a Case from Booking

**Case Title Examples:**
- Property Dispute Resolution
- Divorce Settlement
- Contract Breach Compensation
- Business Partnership Dissolution
- Trademark Infringement

**Case Description Should Include:**
- Background of the situation
- Parties involved
- What you're seeking
- Any relevant history
- Specific legal concerns

**After Case Creation:**
You'll have access to:
- Document upload & sharing
- Hearing date tracking
- Case timeline & updates
- Direct messaging with lawyer
- Case status updates

## Time Format

All times are displayed in **12-hour format** with AM/PM:
- 11:00 AM (not 11:00)
- 2:00 PM (not 14:00)
- 12:30 PM (not 12:30)

## Availability Display

### For Lawyers
- **Lawyer Dashboard**: View and manage all slots
- **Lawyer Profile**: Public availability shown to clients

### For Clients
- **Lawyer Profile**: See available consultation slots
- **Calendar View**: Browse dates with open slots
- **Slot Info**: Each slot shows exact timing and duration

## Booking Limitations

### For Slots
- ✓ Can book future dates only
- ✗ Cannot book past dates
- ✗ Cannot book same-day consultations
- ✓ Can override by setting custom dates (for lawyers)

### For Bookings
- ✓ Clients can cancel up to consultation date
- ✓ Lawyers can accept/decline pending bookings
- ✓ Completed bookings can be reviewed
- ✓ Completed bookings can be linked to cases

## Management Features

### View Consultations
- **Bookings Page**: All your consultation bookings
- **Lawyer Dashboard**: Manage & respond to requests
- **Filter by Status**: Pending, Confirmed, Completed, Cancelled

### Consultation Details
Each booking shows:
- Lawyer/Client name
- Date & time
- Amount (if applicable)
- Notes from client
- Current status
- Action buttons based on role

## Tips & Best Practices

### For Lawyers
1. **Generate slots regularly** - Use "Generate (11 AM-2 PM)" for quick setup
2. **Custom slots** - Create slots outside default hours for flexible availability
3. **Respond quickly** - Accept/decline pending bookings within 24 hours
4. **Document slots** - Keep record of consultation details

### For Clients
1. **Book in advance** - Reserve slots at least 1-2 days ahead
2. **Clear notes** - Provide context about your legal issue
3. **Plan accordingly** - Each consultation is 40 minutes
4. **Book for case** - Convert consultation to full case representation when ready
5. **Add documents** - Once case is created, upload relevant documents

## Troubleshooting

**No slots available?**
- Lawyer may not have generated slots yet
- Contact lawyer directly via messaging
- Or try other lawyers with available slots

**Cannot modify booking?**
- Meetings in past cannot be modified
- Contact support if booking is recent

**Charges for consultation?**
- Amount shown on booking card (if applicable)
- Contact lawyer for pricing details
- Payment handled through platform

**Want to reschedule?**
- Cancel current booking
- Book new time slot
- Notify lawyer via message

## Integration Points

### Related Features
- **Messages**: Communicate with lawyer
- **Reviews**: Leave feedback after consultation
- **Cases**: Create full case after consultation
- **Dashboard**: Manage all interactions

### Next Steps After Booking
1. Receive confirmation email
2. Add to calendar
3. Prepare questions/documents
4. Join follow messaging channel
5. After consultation: Leave review & book case if needed

## Support

For issues with:
- **Slot creation**: Check Lawyer Dashboard → Manage Slots
- **Booking**: Check Bookings page for status
- **Case linking**: Use "Book for a Case" button after consultation
- **Technical issues**: Contact support through messaging

