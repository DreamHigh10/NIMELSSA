import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import { StudentLevel } from '../types/election';

export interface ParsedStudentPreview {
  matricNumber: string;
  fullName: string;
  level: StudentLevel;
  department?: string;
  phone?: string;
  email?: string;
  isValid: boolean;
  status: 'valid' | 'duplicate_in_file' | 'already_in_db' | 'invalid_format';
  validationMessage?: string;
}

export interface ParseResult {
  fileName: string;
  fileType: string;
  totalFound: number;
  validCount: number;
  duplicateCount: number;
  alreadyInDbCount: number;
  invalidCount: number;
  students: ParsedStudentPreview[];
  rawTextPreview: string;
}

// Regex patterns used at Abia State University (ABSU) for Medical Laboratory Science:
// 1. 2023/137945/Regular (Official standard ABSU format)
// 2. 2023/137945/regular or 2023/137945/REGULAR
// 3. 2023/137945 (stream omitted)
// 4. Departmental variants: 2021/MLS/11209
const MATRIC_REGEXES = [
  /\b(20\d{2}\/\d{5,7}\/Regular)\b/i,
  /\b(20\d{2}\/\d{5,7}\/[A-Za-z]+)\b/i,
  /\b(20\d{2}\/\d{5,7})\b/i,
  /\b(20\d{2}\/MLS\/\d{3,6})\b/i,
  /\b(ABSU\/MLS\/\d{2,4}\/\d{3,6})\b/i,
  /\b(ABSU\/\d{2,4}\/MLS\/\d{3,6})\b/i,
  /\b(\d{2}\/MLS\/\d{3,6})\b/i,
];

export async function parseMatricListFile(
  file: File,
  targetLevel: StudentLevel,
  existingMatricNumbers: Set<string>
): Promise<ParseResult> {
  const fileName = file.name;
  const fileExt = fileName.split('.').pop()?.toLowerCase() || '';
  let extractedText = '';

  try {
    if (fileExt === 'xlsx' || fileExt === 'xls') {
      extractedText = await extractTextFromExcel(file);
    } else if (fileExt === 'docx') {
      extractedText = await extractTextFromDocx(file);
    } else if (fileExt === 'pdf') {
      extractedText = await extractTextFromPdf(file);
    } else if (fileExt === 'csv' || fileExt === 'txt') {
      extractedText = await file.text();
    } else {
      // Fallback try reading as text or arrayBuffer
      extractedText = await file.text();
    }
  } catch (err) {
    console.warn('Direct file decoding warning, falling back to text read:', err);
    try {
      extractedText = await file.text();
    } catch {
      extractedText = '';
    }
  }

  return parseRawTextToStudents(extractedText, fileName, fileExt, targetLevel, existingMatricNumbers);
}

// Extract rows from Excel (.xlsx, .xls) using SheetJS
async function extractTextFromExcel(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
  const textChunks: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (sheet) {
      const csv = XLSX.utils.sheet_to_csv(sheet);
      textChunks.push(csv);
    }
  }

  return textChunks.join('\n');
}

// Extract text from Word (.docx) using mammoth
async function extractTextFromDocx(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    if (result && result.value) {
      return result.value;
    }
  } catch (e) {
    console.warn('Mammoth docx parse notice, attempting XML fallback:', e);
  }

  const arrayBuffer = await file.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);
  const textDecoder = new TextDecoder('utf-8', { fatal: false });
  const rawDecoded = textDecoder.decode(uint8);

  const textMatches = rawDecoded.match(/<w:t[^>]*>([^<]+)<\/w:t>/g);
  if (textMatches && textMatches.length > 0) {
    return textMatches
      .map((tag) => tag.replace(/<[^>]+>/g, ''))
      .join(' ')
      .replace(/\s+/g, '\n');
  }

  return rawDecoded;
}

// Extract text from PDF
async function extractTextFromPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);
  const textDecoder = new TextDecoder('latin1');
  const rawDecoded = textDecoder.decode(uint8);

  const textChunks: string[] = [];
  const tjMatches = rawDecoded.match(/\((.*?)\)\s*Tj/g);
  if (tjMatches) {
    for (const tj of tjMatches) {
      const match = tj.match(/\((.*?)\)/);
      if (match && match[1]) {
        textChunks.push(match[1]);
      }
    }
  }

  if (textChunks.length > 0) {
    return textChunks.join('\n');
  }

  return rawDecoded;
}

export function parseRawTextToStudents(
  text: string,
  fileName: string,
  fileType: string,
  targetLevel: StudentLevel,
  existingMatricNumbers: Set<string>
): ParseResult {
  const lines = text.split(/\r?\n/);
  const students: ParsedStudentPreview[] = [];
  const seenInFile = new Set<string>();

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.length < 5) continue;

    // Skip headers like "S/N, Matric No, Name, Department"
    if (/matric\s*no|serial|full\s*name|department|level/i.test(line) && line.split(/[,\t;|]/).length > 2) {
      continue;
    }

    // Try finding matric number
    let foundMatric = '';
    for (const rx of MATRIC_REGEXES) {
      const match = line.match(rx);
      if (match) {
        foundMatric = match[1].toUpperCase();
        break;
      }
    }

    // Attempt to extract name, phone, email
    let detectedName = '';
    let detectedEmail = '';
    let detectedPhone = '';

    const emailMatch = line.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) {
      detectedEmail = emailMatch[0].toLowerCase();
    }

    const phoneMatch = line.match(/\b(0[789][01]\d{8}|\+?234[789][01]\d{8})\b/);
    if (phoneMatch) {
      detectedPhone = phoneMatch[0];
    }

    if (line.includes(',') || line.includes('\t') || line.includes(';')) {
      const parts = line.split(/[,\t;|]/).map((p) => p.trim()).filter(Boolean);
      for (const part of parts) {
        if (
          part.toUpperCase() !== foundMatric &&
          part !== detectedEmail &&
          part !== detectedPhone &&
          part.length > 2 &&
          !/^\d+$/.test(part) &&
          !/\d{2,4}\/MLS/i.test(part)
        ) {
          if (/[a-zA-Z]{2,}/.test(part) && !/100L|200L|300L|400L|500L|REGULAR|REG/i.test(part)) {
            detectedName = part;
            break;
          }
        }
      }
    } else if (foundMatric) {
      const withoutMatric = line
        .replace(foundMatric, '')
        .replace(detectedEmail, '')
        .replace(detectedPhone, '')
        .replace(/^\d+[\.\)]?\s*/, '')
        .replace(/[-_]/g, ' ')
        .trim();
      if (withoutMatric.length > 3) {
        detectedName = withoutMatric;
      }
    }

    // Auto-detect level if mentioned in line, otherwise fallback to targetLevel
    let level: StudentLevel = targetLevel;
    const levelMatch = line.match(/\b(100L|200L|300L|400L|500L)\b/i);
    if (levelMatch) {
      level = levelMatch[1].toUpperCase() as StudentLevel;
    }

    if (!foundMatric) {
      const genericSlash = line.match(/\b(20\d{2}\/\d{5,7})\b/);
      if (genericSlash) {
        foundMatric = `${genericSlash[1]}/Regular`;
      }
    }

    if (foundMatric) {
      let cleanMatric = foundMatric.trim().toUpperCase();
      if (/^20\d{2}\/\d{5,7}$/.test(cleanMatric)) {
        cleanMatric = `${cleanMatric}/REGULAR`;
      }
      const displayMatric = cleanMatric.replace(/\/REGULAR$/, '/Regular');
      const cleanName = cleanNameFormat(detectedName) || `Student (${displayMatric})`;

      if (seenInFile.has(cleanMatric)) {
        students.push({
          matricNumber: displayMatric,
          fullName: cleanName,
          level,
          phone: detectedPhone,
          email: detectedEmail,
          department: 'Medical Laboratory Science',
          isValid: false,
          status: 'duplicate_in_file',
          validationMessage: 'Duplicate entry detected within this uploaded file.',
        });
      } else if (existingMatricNumbers.has(cleanMatric)) {
        seenInFile.add(cleanMatric);
        students.push({
          matricNumber: displayMatric,
          fullName: cleanName,
          level,
          phone: detectedPhone,
          email: detectedEmail,
          department: 'Medical Laboratory Science',
          isValid: false,
          status: 'already_in_db',
          validationMessage: 'Matric number is already registered in master eligibility roll.',
        });
      } else {
        seenInFile.add(cleanMatric);
        students.push({
          matricNumber: displayMatric,
          fullName: cleanName,
          level,
          phone: detectedPhone,
          email: detectedEmail,
          department: 'Medical Laboratory Science',
          isValid: true,
          status: 'valid',
        });
      }
    }
  }

  const validCount = students.filter((s) => s.status === 'valid').length;
  const duplicateCount = students.filter((s) => s.status === 'duplicate_in_file').length;
  const alreadyInDbCount = students.filter((s) => s.status === 'already_in_db').length;
  const invalidCount = students.filter((s) => !s.isValid).length;

  return {
    fileName,
    fileType,
    totalFound: students.length,
    validCount,
    duplicateCount,
    alreadyInDbCount,
    invalidCount,
    students,
    rawTextPreview: text.slice(0, 1000),
  };
}

function cleanNameFormat(name: string): string {
  if (!name) return '';
  return name
    .replace(/[^\w\s\-\.]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
