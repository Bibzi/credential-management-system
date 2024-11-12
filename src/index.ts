import { v4 as uuidv4 } from "uuid";
import { Server, StableBTreeMap } from "azle";
import express from "express";
import { sendNotification } from "./notification";

const HARDCODED_TOKEN = "supersecrettoken";

class Credential {
  id: string;
  studentId: string;
  institutionId: string;
  course: string;
  degree: string;
  graduationYear: number;
  issuedAt: number;
  expirationDate: number;
  renewalCount: number;
  revoked: boolean;

  constructor(
    studentId: string,
    institutionId: string,
    course: string,
    degree: string,
    graduationYear: number
  ) {
    this.id = uuidv4();
    this.studentId = studentId;
    this.institutionId = institutionId;
    this.course = course;
    this.degree = degree;
    this.graduationYear = graduationYear;
    this.issuedAt = Date.now();
    this.expirationDate = this.calculateExpirationDate();
    this.renewalCount = 0;
    this.revoked = false;
  }

  calculateExpirationDate(): number {
    // Calculate the expiration date based on the graduation year
    const expirationYears = 5;
    return Date.now() + expirationYears * 365 * 24 * 60 * 60 * 1000;
  }

  renew(): void {
    this.expirationDate = this.calculateExpirationDate();
    this.renewalCount++;
  }

  revoke(reason: string): void {
    this.revoked = true;
    // Send notification to the student
    sendNotification(
      this.studentId,
      `Your credential has been revoked: ${reason}`
    );
  }
}

class Institution {
  id: string;
  name: string;
  address: string;
  createdAt: number;

  constructor(name: string, address: string) {
    this.id = uuidv4();
    this.name = name;
    this.address = address;
    this.createdAt = Date.now();
  }
}

class Student {
  id: string;
  name: string;
  email: string;
  createdAt: number;

  constructor(name: string, email: string) {
    this.id = uuidv4();
    this.name = name;
    this.email = email;
    this.createdAt = Date.now();
  }
}

class CredentialShare {
  id: string;
  credentialId: string;
  recipientId: string;
  expirationDate: number;
  permissions: string[];

  constructor(
    credentialId: string,
    recipientId: string,
    expirationDate: number,
    permissions: string[]
  ) {
    this.id = uuidv4();
    this.credentialId = credentialId;
    this.recipientId = recipientId;
    this.expirationDate = expirationDate;
    this.permissions = permissions;
  }
}

// Storage
const credentialManager = StableBTreeMap<string, Credential>(0);
const institutionManager = StableBTreeMap<string, Institution>(1);
const studentManager = StableBTreeMap<string, Student>(2);
const credentialShareManager = StableBTreeMap<string, CredentialShare>(3);

// Utility function for hardcoded token authentication
function authenticate(token: string): boolean {
  return token === HARDCODED_TOKEN;
}

export default Server(() => {
  const app = express();
  app.use(express.json());

  // Add this near the top of your server setup
  app.use((req, res, next) => {
    res.header(
      "Access-Control-Allow-Methods",
      "GET, POST, PATCH, PUT, DELETE, OPTIONS"
    );
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Access-Control-Allow-Origin", "*");

    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }

    next();
  });

  // Create credential
  app.post("/credentials", (req, res) => {
    const { studentId, institutionId, course, degree, graduationYear, token } =
      req.body;

    // Authenticate the request
    if (!authenticate(token)) {
      return res.status(401).json({
        status: "401",
        error: "Unauthorized",
      });
    }

    if (!course || !degree) {
      return res.status(400).json({
        status: "400",
        error: "Invalid payload: Ensure 'course' and 'degree' are provided.",
      });
    }

    // Ensure student exists
    const student = studentManager.get(studentId);
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Ensure institution exists
    const institution = institutionManager.get(institutionId);
    if (!institution) {
      return res.status(404).json({ error: "Institution not found" });
    }

    const credential = new Credential(
      studentId,
      institutionId,
      course,
      degree,
      graduationYear
    );
    credentialManager.insert(credential.id, credential);
    return res.status(201).json({ credential });
  });

  app.patch("/test", (req, res) => {
    res.status(200).json({ message: "Test PATCH route works" });
  });

  // Revoke credential with fixed PATCH implementation
  app.patch("/credential/:id/revoke", (req, res) => {
    try {
      const { id } = req.params;
      const { reason, token } = req.body;

      // Authenticate the request
      if (!authenticate(token)) {
        return res.status(401).json({
          status: "401",
          error: "Unauthorized",
        });
      }

      // Validate request body
      if (!reason) {
        return res.status(400).json({
          status: "400",
          error: "Invalid payload: 'reason' is required for revocation",
        });
      }

      const credentialOpt = credentialManager.get(id);

      // Check if credential exists
      if ("None" in credentialOpt) {
        return res.status(404).json({
          status: "404",
          error: "Credential not found",
        });
      }

      const credential = credentialOpt.Some;

      // Check if credential is already revoked
      if (credential.revoked) {
        return res.status(400).json({
          status: "400",
          error: "Credential is already revoked",
        });
      }

      // Revoke the credential
      credential.revoked = true;

      // Send notification to the student
      sendNotification(
        credential.studentId,
        `Your credential has been revoked: ${reason}`
      );

      // Update the credential in storage
      credentialManager.insert(credential.id, credential);

      return res.status(200).json({
        status: "200",
        message: "Credential successfully revoked",
        credential,
      });
    } catch (error) {
      console.error("Error in revoke credential:", error);
      return res.status(500).json({
        status: "500",
        error: "Internal server error while revoking credential",
      });
    }
  });

  // Renew credential
  app.patch("/credentials/:id/renew", (req, res) => {
    const { id } = req.params;
    const { token } = req.body;

    // Authenticate the request
    if (!authenticate(token)) {
      return res.status(401).json({
        status: "401",
        error: "Unauthorized",
      });
    }

    const credentialOpt = credentialManager.get(id);

    // Check if credential exists
    if ("None" in credentialOpt) {
      return res.status(404).json({
        status: "404",
        error: "Credential not found",
      });
    }

    const credential = credentialOpt.Some;

    // Check if credential is revoked
    if (credential.revoked) {
      return res.status(400).json({
        status: "400",
        error: "Cannot renew a revoked credential",
      });
    }

    // Check if credential is expired
    if (credential.expirationDate < Date.now()) {
      return res.status(400).json({
        status: "400",
        error: "Cannot renew an expired credential",
      });
    }

    // Renew the credential
    credential.expirationDate = credential.calculateExpirationDate();
    credential.renewalCount++;

    // Update the credential in storage
    credentialManager.insert(credential.id, credential);

    // Send notification to the student
    sendNotification(
      credential.studentId,
      `Your credential has been renewed. New expiration date: ${new Date(
        credential.expirationDate
      ).toLocaleDateString()}`
    );

    return res.status(200).json({
      status: "200",
      message: "Credential successfully renewed",
      credential,
    });
  });

  // Get all credentials
  app.get("/credentials", (req, res) => {
    const credentials = credentialManager.values();
    if (credentials.length === 0) {
      return res.status(404).json({ error: "No credentials found" });
    }
    return res.status(200).json({ credentials });
  });

  // Get credential by ID
  app.get("/credential/:id", (req, res) => {
    const credential = credentialManager.get(req.params.id);
    if (!credential) {
      return res.status(404).json({ error: "Credential not found" });
    }
    return res.status(200).json({ credential });
  });

  // Search credentials
  app.post("/search-credentials", (req, res) => {
    const { course, degree, graduationYear } = req.body;

    const filteredCredentials = credentialManager
      .values()
      .filter((credential) => {
        let matches = true;
        if (course && !credential.course.includes(course)) matches = false;
        if (degree && !credential.degree.includes(degree)) matches = false;
        if (graduationYear && credential.graduationYear !== graduationYear)
          matches = false;
        return matches;
      });

    if (filteredCredentials.length === 0) {
      return res.status(404).json({ error: "No credentials found" });
    }
    return res.status(200).json({ credentials: filteredCredentials });
  });

  // Verify credential
  app.post("/verify-credential", (req, res) => {
    const { studentId, institutionId } = req.body;

    const credential = credentialManager
      .values()
      .find(
        (credential) =>
          credential.studentId === studentId &&
          credential.institutionId === institutionId &&
          !credential.revoked &&
          credential.expirationDate > Date.now()
      );

    if (!credential) {
      return res.status(404).json({ error: "Credential not found" });
    }
    return res.status(200).json({ 
      message: "Credential verified successfully",
      credential 
    });
  });

  // Share credential
  app.post("/credentials/:id/share", (req, res) => {
    const { id } = req.params;
    const { recipientId, expirationDate, permissions, token } = req.body;

    // Authenticate the request
    if (!authenticate(token)) {
      return res.status(401).json({
        status: "401",
        error: "Unauthorized",
      });
    }

    const credential = credentialManager.get(id);
    if (!credential) {
      return res.status(404).json({ error: "Credential not found" });
    }

    const credentialShare = new CredentialShare(
      id,
      recipientId,
      expirationDate,
      permissions
    );
    credentialShareManager.insert(credentialShare.id, credentialShare);
    return res.status(201).json({ credentialShare });
  });

  // Get all credentials
  app.get("/credentials", (req, res) => {
    const credentials = credentialManager.values();
    if (credentials.length === 0) {
      return res.status(404).json({ error: "No credentials found" });
    }
    return res.status(200).json({ credentials });
  });

  // Get credential by ID
  app.get("/credential/:id", (req, res) => {
    const credential = credentialManager.get(req.params.id);
    if (!credential) {
      return res.status(404).json({ error: "Credential not found" });
    }
    return res.status(200).json({ credential });
  });

  // Search credentials
  app.post("/search-credentials", (req, res) => {
    const { course, degree, graduationYear } = req.body;

    const filteredCredentials = credentialManager
      .values()
      .filter((credential) => {
        let matches = true;
        if (course && !credential.course.includes(course)) matches = false;
        if (degree && !credential.degree.includes(degree)) matches = false;
        if (graduationYear && credential.graduationYear !== graduationYear)
          matches = false;
        return matches;
      });

    if (filteredCredentials.length === 0) {
      return res.status(404).json({ error: "No credentials found" });
    }
    return res.status(200).json({ credentials: filteredCredentials });
  });

  // Create institution
  app.post("/institutions", (req, res) => {
    const { name, address } = req.body;

    if (!name || !address) {
      return res.status(400).json({
        error: "Invalid payload: Ensure 'name' and 'address' are provided.",
      });
    }

    const institution = new Institution(name, address);
    institutionManager.insert(institution.id, institution);
    return res.status(201).json({ institution });
  });

  // Get institution by ID
  app.get("/institutions/:id", (req, res) => {
    const institution = institutionManager.get(req.params.id);
    if (!institution) {
      return res.status(404).json({ error: "Institution not found" });
    }
    return res.status(200).json({ institution });
  });

  // Get all institutions
  app.get("/institutions", (req, res) => {
    const institutions = institutionManager.values();
    if (institutions.length === 0) {
      return res.status(404).json({ error: "No institutions found" });
    }
    return res.status(200).json({ institutions });
  });

  // Get institution by ID
  app.get("/institution/:id", (req, res) => {
    const institution = institutionManager.get(req.params.id);
    if (!institution) {
      return res.status(404).json({ error: "Institution not found" });
    }
    return res.status(200).json({ institution });
  });

  // Create student
  app.post("/students", (req, res) => {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        status: "400",
        error: "Invalid payload: Ensure 'name' and 'email' are provided.",
      });
    }

    const student = new Student(name, email);
    studentManager.insert(student.id, student);
    return res.status(201).json({ student });
  });

  // Get all students
  app.get("/students", (req, res) => {
    const students = studentManager.values();
    if (students.length === 0) {
      return res.status(404).json({ error: "No students found" });
    }
    return res.status(200).json({ students });
  });

  // Get student by ID
  app.get("/student/:id", (req, res) => {
    const student = studentManager.get(req.params.id);
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }
    return res.status(200).json({ student });
  });

  // Verify credential
  app.post("/verify-credential", (req, res) => {
    const { studentId, institutionId } = req.body;

    const credential = credentialManager
      .values()
      .find(
        (credential) =>
          credential.studentId === studentId &&
          credential.institutionId === institutionId &&
          !credential.revoked
      );

    if (!credential) {
      return res.status(404).json({ error: "Credential not found" });
    }
    return res.status(200).json({ credential });
  });

  return app.listen();
});
