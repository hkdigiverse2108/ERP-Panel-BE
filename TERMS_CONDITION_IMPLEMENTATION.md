# Terms & Condition Module - Complete Implementation

## 📁 Files Created/Updated

### 1. Model

**File**: `src/database/model/termsCondition.ts`

```typescript
const termsConditionSchema = new Schema<ITermsCondition>(
  {
    ...baseSchemaFields,
    termsCondition: { type: String, required: true, trim: true },
    isDefault: { type: Boolean, default: false },
  },
  baseSchemaOptions,
);
```

### 2. Validation

**File**: `src/validation/termsCondition.ts`

- `addTermsConditionSchema` - Add new terms & condition
- `editTermsConditionSchema` - Edit existing terms & condition
- `deleteTermsConditionSchema` - Delete terms & condition
- `getTermsConditionSchema` - Get single terms & condition

### 3. Types

**File**: `src/types/termsCondition.ts`

```typescript
export interface ITermsCondition extends IBase {
  termsCondition: string;
  isDefault?: boolean;
}
```

### 4. Controller

**File**: `src/controllers/termsCondition/index.ts`

#### Endpoints:

1. **addTermsCondition** - POST /add
   - Create new terms & condition
   - Auto unset other defaults if isDefault=true
   - Requires authentication

2. **editTermsCondition** - PUT /edit
   - Update existing terms & condition
   - Manage default flag
   - Requires authentication

3. **deleteTermsCondition** - DELETE /:id
   - Soft delete terms & condition
   - Audit tracking
   - Requires authentication

4. **getAllTermsCondition** - GET /all
   - List all terms & conditions with pagination
   - Search, filters, sorting
   - Supports: page, limit, search, activeFilter, isDefaultFilter, companyFilter

5. **getTermsConditionById** - GET /:id
   - Get single terms & condition by ID
   - Includes populated references

6. **getTermsConditionDropdown** - GET /dropdown
   - Get dropdown list
   - Active records only
   - Supports: search, isDefault filter
   - Optimized for form select fields

### 5. Routes

**File**: `src/routes/termsCondition.ts`

```typescript
router.post("/add", termsConditionController.addTermsCondition);
router.put("/edit", termsConditionController.editTermsCondition);
router.delete("/:id", termsConditionController.deleteTermsCondition);
router.get("/all", termsConditionController.getAllTermsCondition);
router.get("/dropdown", termsConditionController.getTermsConditionDropdown);
router.get("/:id", termsConditionController.getTermsConditionById);
```

### 6. Exports Updated

**File**: `src/controllers/index.ts`

```typescript
export * as termsConditionController from "./termsCondition";
```

**File**: `src/database/model/index.ts`

```typescript
export * from "./termsCondition";
```

**File**: `src/validation/index.ts`

```typescript
export * from "./termsCondition";
```

**File**: `src/types/index.ts`

```typescript
export * from "./termsCondition";
```

**File**: `src/routes/index.ts`

```typescript
import { termsConditionRouter } from "./termsCondition";
router.use("/terms-condition", termsConditionRouter);
```

---

## 🎯 API Endpoints

### Base URL

```
http://localhost:3000/api/terms-condition
```

### 1. Add Terms & Condition

```
POST /add
Content-Type: application/json
Authorization: Bearer <token>

{
  "termsCondition": "Payment terms: Net 30 days",
  "isDefault": true,
  "isActive": true
}

Response:
{
  "statusCode": 201,
  "message": "Terms & Condition added successfully",
  "data": {
    "_id": "60d5ec49...",
    "termsCondition": "Payment terms: Net 30 days",
    "isDefault": true,
    "isActive": true,
    "createdAt": "2026-01-26T10:00:00.000Z"
  }
}
```

### 2. Edit Terms & Condition

```
PUT /edit
Content-Type: application/json
Authorization: Bearer <token>

{
  "termsConditionId": "60d5ec49...",
  "termsCondition": "Payment terms: Net 45 days",
  "isDefault": false,
  "isActive": true
}

Response:
{
  "statusCode": 200,
  "message": "Terms & Condition updated successfully",
  "data": { ... }
}
```

### 3. Delete Terms & Condition

```
DELETE /:id
Authorization: Bearer <token>

Response:
{
  "statusCode": 200,
  "message": "Terms & Condition deleted successfully",
  "data": { ... }
}
```

### 4. Get All Terms & Conditions

```
GET /all?page=1&limit=10&search=payment&isDefaultFilter=true&activeFilter=true

Response:
{
  "statusCode": 200,
  "message": "Terms & Condition fetched successfully",
  "data": {
    "termsCondition_data": [ ... ],
    "totalData": 25,
    "state": {
      "page": 1,
      "limit": 10,
      "totalPages": 3
    }
  }
}
```

### 5. Get Single Terms & Condition

```
GET /:id

Response:
{
  "statusCode": 200,
  "message": "Terms & Condition fetched successfully",
  "data": {
    "_id": "60d5ec49...",
    "termsCondition": "...",
    "isDefault": true,
    "companyId": { ... },
    "branchId": { ... }
  }
}
```

### 6. Get Terms & Condition Dropdown

```
GET /dropdown?search=payment&isDefault=true

Response:
{
  "statusCode": 200,
  "message": "Terms & Condition fetched successfully",
  "data": [
    {
      "_id": "60d5ec49...",
      "name": "Payment terms: Net 30 days",
      "termsCondition": "Payment terms: Net 30 days",
      "isDefault": true
    }
  ]
}
```

---

## 🔑 Key Features

✅ **Default Management** - Auto-unset other defaults when setting isDefault=true  
✅ **Soft Delete** - Records marked as deleted, not permanently removed  
✅ **Audit Trail** - Tracks createdBy, updatedBy, timestamps  
✅ **Company Isolation** - Each company has separate terms & conditions  
✅ **Search & Filters** - Full-text search, active filter, default filter  
✅ **Pagination** - Full pagination support with offset  
✅ **Dropdown Support** - Optimized endpoint for form selects  
✅ **Error Handling** - Complete error responses with proper HTTP codes

---

## 📊 Database Schema

```typescript
{
  ...baseSchemaFields,           // Includes: isDeleted, isActive, createdBy, updatedBy, companyId, branchId

  termsCondition: {
    type: String,
    required: true,
    trim: true,                  // Auto-trimmed on save
  },

  isDefault: {
    type: Boolean,
    default: false,             // Flag to mark default T&C for company
  },

  timestamps: true,             // createdAt, updatedAt
  versionKey: false,
}
```

---

## 🧪 Test Examples

### Using Postman

#### Add Terms & Condition

```
POST http://localhost:3000/api/terms-condition/add

Headers:
- Authorization: Bearer YOUR_JWT_TOKEN
- Content-Type: application/json

Body:
{
  "termsCondition": "1. Payment within 30 days\n2. No cancellation after 7 days\n3. GST applicable as per law",
  "isDefault": true
}
```

#### Get Dropdown for Form

```
GET http://localhost:3000/api/terms-condition/dropdown?isDefault=true

Headers:
- Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 📝 Integration Example

### Using in Supplier Bill

```typescript
// In supplierBill controller
const response = await supplierBillModel.create({
  ...supplierBillData,
  termsAndConditionId: termsConditionId,
  // Will be populated when querying
});

// When fetching with populate
const bill = await supplierBillModel.findById(billId).populate("termsAndConditionId");
// bill.termsAndConditionId = { _id, termsCondition, isDefault, ... }
```

---

## ✅ Implementation Status

- [x] Model created
- [x] Validation schemas created
- [x] TypeScript interface created
- [x] Controller with 6 endpoints
- [x] Routes configured
- [x] All exports updated
- [x] Ready for use

---

## 🚀 Ready to Use

The Terms & Condition module is fully implemented and integrated. All CRUD operations are available with proper validation, error handling, and audit trails.

For API usage, refer to the endpoint documentation above or check the postman collection.
