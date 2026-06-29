# DHFMS / Project AEGIS — Power Automate Flow Drafts

Purpose:
Create consistent HTTP-triggered read flows for React/Vite integration.

Base pattern:
- Trigger: When an HTTP request is received
- Trigger access: Anyone
- Method: POST
- Request body schema:
{
  "type": "object",
  "properties": {}
}
- Get items from SharePoint
- Select normalized fields
- Response 200 with JSON array
- Response headers:
  text Content-Type = application/json
  text Access-Control-Allow-Origin = *
  text Access-Control-Allow-Headers = Content-Type
  text Access-Control-Allow-Methods = POST, OPTIONS

Important:
All SharePoint lookup/person/choice fields must be normalized to plain text or number before they reach React.

---

## 1. Flow: DHFMS_GetVehicles

### Trigger

Action:
When an HTTP request is received

Fields:
- text Who can trigger the flow = Anyone
- text Request Body JSON Schema =
{
  "type": "object",
  "properties": {}
}

### Get items

Action:
Get items — SharePoint

Fields:
- text Site Address = <DYKAT SharePoint site>
- text List Name = Vehicles

### Select

Action:
Select

Fields:
- ⚡ From = value from Get items

Map:

- text id  
  fx item()?['ID']

- text code  
  fx coalesce(item()?['Code'], item()?['VehicleCode'], item()?['Title'], '')

- text plate  
  fx coalesce(item()?['Plate'], item()?['RegistrationNumber'], item()?['VehiclePlate'], '')

- text type  
  fx coalesce(item()?['Type']?['Value'], item()?['Type'], item()?['VehicleType']?['Value'], item()?['VehicleType'], 'Vehicle')

- text owner  
  fx coalesce(item()?['Owner']?['Value'], item()?['Owner']?['DisplayName'], item()?['Owner'], item()?['OwnerName'], 'Unknown')

- text siteId  
  fx int(coalesce(item()?['Site']?['Id'], item()?['SiteId'], item()?['SiteID'], 2))

- text status  
  fx coalesce(item()?['Status']?['Value'], item()?['Status'], 'Active')

- text insuranceExpiry  
  fx coalesce(item()?['InsuranceExpiry'], item()?['InsuranceDate'], null)

- text kteoExpiry  
  fx coalesce(item()?['KteoExpiry'], item()?['KTEOExpiry'], null)

### Response

Action:
Response

Fields:
- text Status Code = 200
- text Header: Content-Type = application/json
- text Header: Access-Control-Allow-Origin = *
- text Header: Access-Control-Allow-Headers = Content-Type
- text Header: Access-Control-Allow-Methods = POST, OPTIONS
- ⚡ Body = Output from Select

---

## 2. Flow: DHFMS_GetSites

### Trigger

Action:
When an HTTP request is received

Fields:
- text Who can trigger the flow = Anyone
- text Request Body JSON Schema =
{
  "type": "object",
  "properties": {}
}

### Get items

Action:
Get items — SharePoint

Fields:
- text Site Address = <DYKAT SharePoint site>
- text List Name = Sites

### Select

Action:
Select

Fields:
- ⚡ From = value from Get items

Map:

- text id  
  fx item()?['ID']

- text name  
  fx coalesce(item()?['Name'], item()?['Title'], item()?['SiteName'], 'Site')

- text phase  
  fx coalesce(item()?['Phase']?['Value'], item()?['Phase'], item()?['Stage']?['Value'], item()?['Stage'], null)

- text status  
  fx coalesce(item()?['Status']?['Value'], item()?['Status'], 'Active')

- text coordinates  
  fx coalesce(item()?['Coordinates'], item()?['Location'], null)

### Response

Fields:
- text Status Code = 200
- text Header: Content-Type = application/json
- text Header: Access-Control-Allow-Origin = *
- text Header: Access-Control-Allow-Headers = Content-Type
- text Header: Access-Control-Allow-Methods = POST, OPTIONS
- ⚡ Body = Output from Select

---

## 3. Flow: DHFMS_GetEquipment

### Trigger

Action:
When an HTTP request is received

Fields:
- text Who can trigger the flow = Anyone
- text Request Body JSON Schema =
{
  "type": "object",
  "properties": {}
}

### Get items

Action:
Get items — SharePoint

Fields:
- text Site Address = <DYKAT SharePoint site>
- text List Name = Equipment

### Select

Action:
Select

Fields:
- ⚡ From = value from Get items

Map:

- text id  
  fx item()?['ID']

- text name  
  fx coalesce(item()?['Name'], item()?['Title'], item()?['EquipmentName'], 'Equipment')

- text serial  
  fx coalesce(item()?['Serial'], item()?['SerialNumber'], item()?['EquipmentSerial'], null)

- text siteId  
  fx int(coalesce(item()?['Site']?['Id'], item()?['SiteId'], item()?['SiteID'], 2))

- text status  
  fx coalesce(item()?['Status']?['Value'], item()?['Status'], 'Active')

### Response

Fields:
- text Status Code = 200
- text Header: Content-Type = application/json
- text Header: Access-Control-Allow-Origin = *
- text Header: Access-Control-Allow-Headers = Content-Type
- text Header: Access-Control-Allow-Methods = POST, OPTIONS
- ⚡ Body = Output from Select

---

## 4. Flow: DHFMS_GetPpeIssues

### Trigger

Action:
When an HTTP request is received

Fields:
- text Who can trigger the flow = Anyone
- text Request Body JSON Schema =
{
  "type": "object",
  "properties": {}
}

### Get items

Action:
Get items — SharePoint

Fields:
- text Site Address = <DYKAT SharePoint site>
- text List Name = PPEIssuances

### Select

Action:
Select

Fields:
- ⚡ From = value from Get items

Map:

- text id  
  fx item()?['ID']

- text employeeId  
  fx int(coalesce(item()?['Employee']?['Id'], item()?['EmployeeId'], item()?['EmployeeID'], 0))

- text siteId  
  fx int(coalesce(item()?['Site']?['Id'], item()?['SiteId'], item()?['SiteID'], 2))

- text issueDate  
  fx coalesce(item()?['IssueDate'], item()?['IssuedDate'], '')

- text issuedBy  
  fx coalesce(item()?['IssuedBy']?['DisplayName'], item()?['IssuedBy']?['Value'], item()?['IssuedBy'], item()?['IssuedByName'], '')

- text status  
  fx coalesce(item()?['Status']?['Value'], item()?['Status'], 'Pending')

### Response

Fields:
- text Status Code = 200
- text Header: Content-Type = application/json
- text Header: Access-Control-Allow-Origin = *
- text Header: Access-Control-Allow-Headers = Content-Type
- text Header: Access-Control-Allow-Methods = POST, OPTIONS
- ⚡ Body = Output from Select

---

## 5. Flow: DHFMS_GetTrainingSessions

### Trigger

Action:
When an HTTP request is received

Fields:
- text Who can trigger the flow = Anyone
- text Request Body JSON Schema =
{
  "type": "object",
  "properties": {}
}

### Get items

Action:
Get items — SharePoint

Fields:
- text Site Address = <DYKAT SharePoint site>
- text List Name = TrainingSessions

### Select

Action:
Select

Fields:
- ⚡ From = value from Get items

Map:

- text id  
  fx item()?['ID']

- text title  
  fx coalesce(item()?['Title'], item()?['TrainingTitle'], item()?['Name'], 'Training')

- text date  
  fx coalesce(item()?['Date'], item()?['TrainingDate'], item()?['SessionDate'], '')

- text trainerName  
  fx coalesce(item()?['TrainerName'], item()?['Trainer']?['DisplayName'], item()?['Trainer']?['Value'], item()?['Trainer'], '')

- text siteId  
  fx int(coalesce(item()?['Site']?['Id'], item()?['SiteId'], item()?['SiteID'], 2))

- text participantIds  
  fx createArray()

- text status  
  fx coalesce(item()?['Status']?['Value'], item()?['Status'], 'Pending')

- text pdfUrl  
  fx coalesce(item()?['PdfUrl'], item()?['PDFUrl'], null)

### Response

Fields:
- text Status Code = 200
- text Header: Content-Type = application/json
- text Header: Access-Control-Allow-Origin = *
- text Header: Access-Control-Allow-Headers = Content-Type
- text Header: Access-Control-Allow-Methods = POST, OPTIONS
- ⚡ Body = Output from Select

---

## 6. Flow: DHFMS_GetDocuments

### Trigger

Action:
When an HTTP request is received

Fields:
- text Who can trigger the flow = Anyone
- text Request Body JSON Schema =
{
  "type": "object",
  "properties": {}
}

### Get items

Action:
Get items — SharePoint

Fields:
- text Site Address = <DYKAT SharePoint site>
- text List Name = EvidenceDocuments OR target document list/library

### Select

Action:
Select

Fields:
- ⚡ From = value from Get items

Map:

- text id  
  fx item()?['ID']

- text entityType  
  fx coalesce(item()?['EntityType']?['Value'], item()?['EntityType'], 'employee')

- text entityId  
  fx int(coalesce(item()?['Employee']?['Id'], item()?['Vehicle']?['Id'], item()?['Asset']?['Id'], item()?['EntityId'], 0))

- text documentType  
  fx coalesce(item()?['DocumentType']?['Value'], item()?['DocumentType'], item()?['Title'], item()?['CertificateType'], 'Document')

- text issueDate  
  fx coalesce(item()?['IssueDate'], item()?['IssuedDate'], null)

- text expiryDate  
  fx coalesce(item()?['ExpiryDate'], item()?['ValidTo'], null)

- text status  
  fx coalesce(item()?['Status']?['Value'], item()?['Status'], 'Active')

- text url  
  fx coalesce(item()?['Url'], item()?['FileRef'], item()?['Link'], null)

### Response

Fields:
- text Status Code = 200
- text Header: Content-Type = application/json
- text Header: Access-Control-Allow-Origin = *
- text Header: Access-Control-Allow-Headers = Content-Type
- text Header: Access-Control-Allow-Methods = POST, OPTIONS
- ⚡ Body = Output from Select

---

# .env.local variables to add later

VITE_POWERAUTOMATE_FLOW_GET_VEHICLES=
VITE_POWERAUTOMATE_FLOW_GET_SITES=
VITE_POWERAUTOMATE_FLOW_GET_EQUIPMENT=
VITE_POWERAUTOMATE_FLOW_GET_PPE_ISSUES=
VITE_POWERAUTOMATE_FLOW_GET_TRAINING_SESSIONS=
VITE_POWERAUTOMATE_FLOW_GET_DOCUMENTS=

