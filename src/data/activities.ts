export interface Activity {
  id: string;
  name: string;
  category: string;
  met: number;
  icon: string;
}

export const ACTIVITIES: Activity[] = [
  // Cardio
  { id: 'a1',  name: 'Bieganie (8 km/h)',              category: 'Cardio',         met: 8.3,  icon: '🏃' },
  { id: 'a2',  name: 'Bieganie szybkie (12 km/h)',      category: 'Cardio',         met: 11.5, icon: '🏃' },
  { id: 'a3',  name: 'Bieganie wolne (6 km/h)',         category: 'Cardio',         met: 6.0,  icon: '🏃' },
  { id: 'a4',  name: 'Chodzenie (4 km/h)',              category: 'Cardio',         met: 3.5,  icon: '🚶' },
  { id: 'a5',  name: 'Chodzenie szybkie (6 km/h)',      category: 'Cardio',         met: 5.0,  icon: '🚶' },
  { id: 'a6',  name: 'Rower (16–19 km/h)',              category: 'Cardio',         met: 8.0,  icon: '🚴' },
  { id: 'a7',  name: 'Rower stacjonarny (umiark.)',     category: 'Cardio',         met: 7.0,  icon: '🚴' },
  { id: 'a8',  name: 'Pływanie (kraul)',                category: 'Cardio',         met: 8.0,  icon: '🏊' },
  { id: 'a9',  name: 'Pływanie rekreacyjne',           category: 'Cardio',         met: 5.8,  icon: '🏊' },
  { id: 'a10', name: 'Skakanka',                        category: 'Cardio',         met: 11.0, icon: '🤸' },
  { id: 'a11', name: 'Wiosłowanie (ergometr)',          category: 'Cardio',         met: 8.5,  icon: '🚣' },
  { id: 'a12', name: 'Elipsa',                          category: 'Cardio',         met: 5.0,  icon: '⚡' },
  { id: 'a13', name: 'Aerobik',                         category: 'Cardio',         met: 6.0,  icon: '🕺' },
  { id: 'a14', name: 'Zumba',                           category: 'Cardio',         met: 6.5,  icon: '💃' },
  // Siłowe
  { id: 'b1',  name: 'Trening siłowy (umiarkowany)',   category: 'Siłowe',         met: 3.5,  icon: '💪' },
  { id: 'b2',  name: 'Trening siłowy (intensywny)',    category: 'Siłowe',         met: 5.0,  icon: '💪' },
  { id: 'b3',  name: 'Kettlebell',                      category: 'Siłowe',         met: 8.0,  icon: '🏋️' },
  { id: 'b4',  name: 'CrossFit',                        category: 'Siłowe',         met: 9.0,  icon: '🔥' },
  { id: 'b5',  name: 'Pompki i brzuszki',               category: 'Siłowe',         met: 3.8,  icon: '💪' },
  { id: 'b6',  name: 'TRX / obciążenie własne ciało',  category: 'Siłowe',         met: 4.0,  icon: '🏋️' },
  // Sporty
  { id: 'c1',  name: 'Piłka nożna',                    category: 'Sporty',         met: 8.0,  icon: '⚽' },
  { id: 'c2',  name: 'Siatkówka',                      category: 'Sporty',         met: 3.0,  icon: '🏐' },
  { id: 'c3',  name: 'Koszykówka',                     category: 'Sporty',         met: 6.5,  icon: '🏀' },
  { id: 'c4',  name: 'Tenis',                          category: 'Sporty',         met: 7.3,  icon: '🎾' },
  { id: 'c5',  name: 'Badminton',                      category: 'Sporty',         met: 5.5,  icon: '🏸' },
  { id: 'c6',  name: 'Squash',                         category: 'Sporty',         met: 12.0, icon: '🎯' },
  { id: 'c7',  name: 'Tańce towarzyskie',              category: 'Sporty',         met: 5.0,  icon: '💃' },
  // Yoga & Fitness
  { id: 'd1',  name: 'Yoga',                           category: 'Yoga & Fitness', met: 2.5,  icon: '🧘' },
  { id: 'd2',  name: 'Pilates',                        category: 'Yoga & Fitness', met: 3.0,  icon: '🧘' },
  { id: 'd3',  name: 'Stretching',                     category: 'Yoga & Fitness', met: 2.3,  icon: '🤸' },
  { id: 'd4',  name: 'Tai chi',                        category: 'Yoga & Fitness', met: 3.0,  icon: '🥋' },
  // Codzienne
  { id: 'e1',  name: 'Sprzątanie domu',                category: 'Codzienne',      met: 3.5,  icon: '🧹' },
  { id: 'e2',  name: 'Ogrodnictwo',                    category: 'Codzienne',      met: 4.0,  icon: '🌿' },
  { id: 'e3',  name: 'Chodzenie po schodach',          category: 'Codzienne',      met: 8.0,  icon: '🏃' },
  { id: 'e4',  name: 'Zakupy (chodzenie)',             category: 'Codzienne',      met: 2.3,  icon: '🛒' },
  // Zimowe
  { id: 'f1',  name: 'Narciarstwo zjazdowe',           category: 'Zimowe',         met: 5.3,  icon: '⛷️' },
  { id: 'f2',  name: 'Łyżwiarstwo',                   category: 'Zimowe',         met: 5.5,  icon: '⛸️' },
  { id: 'f3',  name: 'Snowboard',                      category: 'Zimowe',         met: 5.3,  icon: '🏂' },
];

export const ACTIVITY_CATEGORIES = [
  'Cardio', 'Siłowe', 'Sporty', 'Yoga & Fitness', 'Codzienne', 'Zimowe',
];

/** MET-based calorie burn: calories = MET × weight_kg × hours */
export function calcBurnedCalories(
  met: number,
  weightKg: number,
  durationMinutes: number,
): number {
  return Math.round(met * weightKg * (durationMinutes / 60));
}
