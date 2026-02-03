'use client';

import * as XLSX from 'xlsx';
import { JointReaction, PointLocation, ProcessedFooting } from '@/types/footing';

/**
 * Parse Excel file and extract Joint Reactions
 */
export function parseJointReactionsSheet(workbook: XLSX.WorkBook): Map<string, JointReaction[]> {
  const sheetName = 'Joint Reactions';
  if (!workbook.SheetNames.includes(sheetName)) {
    throw new Error(`Sheet "${sheetName}" not found in Excel file`);
  }

  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

  const reactions = new Map<string, JointReaction[]>();

  // Skip header rows and process data
  // Looking for columns: C (Unique Name), D (Output Case), H (Fz)
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[2] || !row[3] || row[7] === undefined) continue; // C, D, H columns

    const uniqueName = String(row[2]).trim();
    const outputCase = String(row[3]).trim();
    const fz = Number(row[7]) || 0;

    if (!uniqueName) continue;

    if (!reactions.has(uniqueName)) {
      reactions.set(uniqueName, []);
    }

    reactions.get(uniqueName)!.push({
      uniqueName,
      outputCase,
      fz,
    });
  }

  return reactions;
}

/**
 * Parse Excel file and extract Point Object Connectivity
 */
export function parsePointObjectConnectivitySheet(
  workbook: XLSX.WorkBook
): Map<string, PointLocation> {
  const sheetName = 'Point Object Connectivity';
  if (!workbook.SheetNames.includes(sheetName)) {
    throw new Error(`Sheet "${sheetName}" not found in Excel file`);
  }

  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

  const locations = new Map<string, PointLocation>();

  // Looking for columns: A (Unique Name), F (x), G (y)
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[0] || row[5] === undefined || row[6] === undefined) continue; // A, F, G columns

    const uniqueName = String(row[0]).trim();
    const x = Number(row[5]) || 0;
    const y = Number(row[6]) || 0;

    if (!uniqueName) continue;

    locations.set(uniqueName, {
      uniqueName,
      x,
      y,
    });
  }

  return locations;
}

/**
 * Process Joint Reactions data by combining DL and SDL, separating LL
 */
export function processJointReactions(
  reactions: Map<string, JointReaction[]>
): Map<string, { dl_sdl: number; ll: number }> {
  const processed = new Map<string, { dl_sdl: number; ll: number }>();

  for (const [uniqueName, reactionList] of reactions.entries()) {
    let dlSdl = 0;
    let ll = 0;

    for (const reaction of reactionList) {
      const caseUpper = reaction.outputCase.toUpperCase();
      if (caseUpper.includes('DL') || caseUpper.includes('SDL')) {
        dlSdl += reaction.fz;
      } else if (caseUpper.includes('LL')) {
        ll += reaction.fz;
      }
    }

    processed.set(uniqueName, { dl_sdl: dlSdl, ll });
  }

  return processed;
}

/**
 * Combine location and load data
 */
export function mergeFootingData(
  locations: Map<string, PointLocation>,
  loads: Map<string, { dl_sdl: number; ll: number }>
): ProcessedFooting[] {
  const footings: ProcessedFooting[] = [];

  for (const [uniqueName, location] of locations.entries()) {
    const load = loads.get(uniqueName);
    if (!load) continue;

    const totalLoad = load.dl_sdl + load.ll;

    footings.push({
      uniqueName,
      x: location.x,
      y: location.y,
      dl_sdl: load.dl_sdl,
      ll: load.ll,
      totalLoad,
    });
  }

  return footings;
}

/**
 * Main function to parse Excel file
 */
export function parseExcelFile(file: File): Promise<ProcessedFooting[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = event.target?.result as ArrayBuffer;
        const workbook = XLSX.read(data, { type: 'array' });

        // Parse both sheets
        const reactions = parseJointReactionsSheet(workbook);
        const locations = parsePointObjectConnectivitySheet(workbook);

        // Process reactions (combine DL+SDL, separate LL)
        const processedLoads = processJointReactions(reactions);

        // Merge location and load data
        const footings = mergeFootingData(locations, processedLoads);

        resolve(footings);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsArrayBuffer(file);
  });
}
