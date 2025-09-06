import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

// Base directory for storing images
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const PATIENTS_DIR = path.join(UPLOAD_DIR, "patients");
const THERAPY_DIR = path.join(UPLOAD_DIR, "therapist");
const ADMIN_DIR = path.join(UPLOAD_DIR, "admin");

// Ensure directories exist
export function ensureDirectories() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
  if (!fs.existsSync(PATIENTS_DIR)) {
    fs.mkdirSync(PATIENTS_DIR, { recursive: true });
  }
  if (!fs.existsSync(THERAPY_DIR)) {
    fs.mkdirSync(THERAPY_DIR, { recursive: true });
  }
  if (!fs.existsSync(ADMIN_DIR)) {
    fs.mkdirSync(ADMIN_DIR, { recursive: true });
  }
}

// Convert base64 to file and save
export async function saveBase64Image(
  base64Data: string,
  userId: string
): Promise<string> {
  ensureDirectories();

  // Extract image data and type
  const matches = base64Data.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error("Invalid image data");
  }

  const imageType = matches[1];
  const imageData = matches[2];
  const buffer = Buffer.from(imageData, "base64");

  // Generate unique filename
  const filename = `${userId}-${uuidv4()}.${imageType}`;
  const filePath = path.join(PATIENTS_DIR, filename);

  // Save file
  await fs.promises.writeFile(filePath, buffer);

  // Return public URL
  return `/uploads/patients/${filename}`;
}

export async function saveBase64ImageTherapy(
  base64Data: string,
  userId: string
): Promise<string> {
  ensureDirectories();

  // Extract image data and type
  const matches = base64Data.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error("Invalid image data");
  }

  const imageType = matches[1];
  const imageData = matches[2];
  const buffer = Buffer.from(imageData, "base64");

  // Generate unique filename
  const filename = `${userId}-${uuidv4()}.${imageType}`;
  const filePath = path.join(THERAPY_DIR, filename);

  // Save file
  await fs.promises.writeFile(filePath, buffer);

  // Return public URL
  return `/uploads/therapist/${filename}`;
}

export async function saveBase64ImageAdmin(
  base64Data: string,
  userId: string
): Promise<string> {
  ensureDirectories();

  // Extract image data and type
  const matches = base64Data.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error("Invalid image data");
  }

  const imageType = matches[1];
  const imageData = matches[2];
  const buffer = Buffer.from(imageData, "base64");

  // Generate unique filename
  const filename = `${userId}-${uuidv4()}.${imageType}`;
  const filePath = path.join(ADMIN_DIR, filename);

  // Save file
  await fs.promises.writeFile(filePath, buffer);

  // Return public URL
  return `/uploads/admin/${filename}`;
}


// Delete old profile image
export async function deleteOldProfileImage(imageUrl: string | null) {
  if (!imageUrl) return;

  try {
    const filePath = path.join(process.cwd(), "public", imageUrl);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  } catch (error) {
    console.error("Error deleting old profile image:", error);
  }
}
