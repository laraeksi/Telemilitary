/**
DESIGNER GATE (Access Control)

PURPOSE:
  Prevent players from accessing the analytics dashboard
  Allow only designers to continue

STATE:
  accessGranted = false
  errorMessage = empty

ON COMPONENT LOAD:
  Show "Designer Access Required" message
  Show input field for access password OR role confirmation
  Show "Enter Dashboard" button

ON SUBMIT ACCESS REQUEST:
  IF entered password matches designer password
    Set accessGranted = true
  ELSE
    Show error message "Access denied"

IF accessGranted = true
  Render Dashboard Page
ELSE
  Render Access Gate Screen

ACCESSIBILITY:
  Input and button keyboard accessible
  Clear readable text
  No personal data stored

SECURITY NOTE:
  lightweight role gate, not a full login system
  No player accounts or personal information collected**/
