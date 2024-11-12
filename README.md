# Educational Credential Management System

A secure and scalable system for managing educational credentials built with Express.js and Azle. This system allows educational institutions to issue, verify, and manage digital credentials while enabling students to share their achievements securely.

## Features

- **Credential Management**

  - Issue new educational credentials
  - Revoke existing credentials with reason
  - Renew credentials before expiration
  - Search and verify credentials

- **Institution Management**

  - Register educational institutions
  - Manage institution profiles
  - View institution details

- **Student Management**

  - Register students
  - Manage student profiles
  - Track student credentials

- **Credential Sharing**
  - Share credentials with third parties
  - Set expiration dates for shared credentials
  - Define granular access permissions

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn package manager
- Azle framework
- TypeScript

## Installation

1. Clone the repository:

```bash
git clone https://github.com/Bibzi/credential-management-system.git
cd /credential-management-system
```

2. Install dependencies:

```bash
npm install
```

3. Start The IC Local Replica:

```bash
dfx start --host 127.0.0.1:8000
```

4. Deploy the project Locally

```bash
dfx deploy
```

## API Endpoints

### Credentials

#### Create Credential

```http
POST /credentials
Content-Type: application/json
Authorization: Bearer [token]

{
  "studentId": "string",
  "institutionId": "string",
  "course": "string",
  "degree": "string",
  "graduationYear": number,
  "token": "string"
}
```

#### Revoke Credential

```http
PATCH /credential/:id/revoke
Content-Type: application/json
Authorization: Bearer [token]

{
  "reason": "string",
  "token": "string"
}
```

#### Renew Credential

```http
PATCH /credentials/:id/renew
Content-Type: application/json
Authorization: Bearer [token]

{
  "token": "string"
}
```

#### Search Credentials

```http
POST /search-credentials
Content-Type: application/json

{
  "course": "string",
  "degree": "string",
  "graduationYear": number
}
```

### Institutions

#### Create Institution

```http
POST /institutions
Content-Type: application/json

{
  "name": "string",
  "address": "string"
}
```

#### Get Institution

```http
GET /institutions/:id
```

### Students

#### Create Student

```http
POST /students
Content-Type: application/json

{
  "name": "string",
  "email": "string"
}
```

#### Get Student

```http
GET /student/:id
```

### Verification

#### Verify Credential

```http
POST /verify-credential
Content-Type: application/json

{
  "studentId": "string",
  "institutionId": "string"
}
```

## Security

- Authentication is required for sensitive operations using tokens
- Credentials can be revoked with proper documentation
- Expired credentials cannot be renewed
- Share permissions are granular and time-bound

## Error Handling

The API uses standard HTTP status codes:

- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 404: Not Found
- 500: Internal Server Error

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request.

## Support

For support, please open an issue in the repository.
