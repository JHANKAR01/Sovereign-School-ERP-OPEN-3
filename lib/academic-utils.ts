export type Grade = {
  grade: string;
  min_percentage: number;
  point: number;
};

export const DEFAULT_GRADING_SCALE: Grade[] = [
  { grade: 'A+', min_percentage: 90, point: 10 },
  { grade: 'A', min_percentage: 80, point: 9 },
  { grade: 'B', min_percentage: 70, point: 8 },
  { grade: 'C', min_percentage: 60, point: 7 },
  { grade: 'D', min_percentage: 50, point: 6 },
  { grade: 'E', min_percentage: 40, point: 5 },
  { grade: 'F', min_percentage: 0, point: 0 },
];

export function calculateGrade(percentage: number, scale = DEFAULT_GRADING_SCALE) {
  return scale.find(g => percentage >= g.min_percentage)?.grade || 'F';
}

export function calculateWeightedAverage(results: any[]) {
  if (!results.length) return 0;

  let totalWeightedMarks = 0;
  let totalWeightage = 0;

  results.forEach(res => {
    const percentage = (res.marks_obtained / res.exams.max_marks) * 100;
    const weightage = res.exams.weightage || 100;
    
    totalWeightedMarks += (percentage * weightage);
    totalWeightage += weightage;
  });

  return totalWeightage > 0 ? totalWeightedMarks / totalWeightage : 0;
}
