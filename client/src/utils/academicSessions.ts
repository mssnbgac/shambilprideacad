// Generate academic sessions from 2024/2025 to 2149/2150
export const generateAcademicSessions = (): string[] => {
  const sessions: string[] = [];
  for (let year = 2024; year <= 2149; year++) {
    sessions.push(`${year}/${year + 1}`);
  }
  return sessions.reverse(); // Most recent first
};

// Class options for the school
export const classOptions = [
  'KG',
  'NURSERY 1',
  'NURSERY 2',
  'PRIMARY 1',
  'PRIMARY 2',
  'PRIMARY 3',
  'PRIMARY 4',
  'PRIMARY 5',
  'JSS1A',
  'JSS1B',
  'JSS2A',
  'JSS2B',
  'JSS3A',
  'JSS3B',
  'SS1SCIENCE',
  'SS1ART',
  'SS2SCIENCE',
  'SS2ART',
  'SS3SCIENCE',
  'SS3ART'
];

export const getCurrentSession = (): string => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-12
  
  // If it's September or later, we're in the new academic year
  if (currentMonth >= 9) {
    return `${currentYear}/${currentYear + 1}`;
  } else {
    return `${currentYear - 1}/${currentYear}`;
  }
};

export const academicSessions = generateAcademicSessions();