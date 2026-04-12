// ═══════════════════════════════════════════════════════════════
// THE ULTIMATE ATRIUM STANDARD - MASTER TEMPLATE
// ═══════════════════════════════════════════════════════════════
// RULES FOR AI GENERATION:
// 1. 10-Point History & 10-Point Physical Exam arrays.
// 2. Exactly 10 Differential Diagnoses.
// 3. MINIMUM 12 Test Categories (Stealthy names only, no "Traps" or "Irrelevant" labels).
// 4. MINIMUM 12 Treatment Categories (Stealthy names only, no "Contraindicated" labels).
// 5. Penalty Engine Active: Every test/treatment must have c: true or c: false.
// 6. Deep Review Summary explaining pathophysiology, test rationale, and lethal traps.
// ═══════════════════════════════════════════════════════════════

  {
    id: '[short_unique_id]', name: '[Specialty Name]: Level [1/2/3]', color: '[#hexcolor]', emoji: '[emoji]', waitDays: [int],
    caseTitle: '[Short, symptom-based title]',
    caseDesc: '[Brief instruction to the student setting the clinical scene and stakes]',
    patient: { name: '[Name]', gender: '[Male/Female]', age: '[XX Y]', complaint: '[Chief complaint]' },
    vitals: [
      { icon: '🌡️', label: 'Temperature', val: '[XX.X°C]' },
      { icon: '❤️', label: 'Heart Rate', val: '[XX bpm]' },
      { icon: '📈', label: 'Blood Pressure', val: '[XXX/XX mmHg]' },
      { icon: '🫁', label: 'Respiratory Rate', val: '[XX/min]' },
      { icon: '💧', label: 'SpO2', val: '[XX% on room air/O2]' }
    ],
    history: [
      '1. [History point 1]',
      '2. [History point 2]',
      '3. [History point 3]',
      '4. [History point 4]',
      '5. [History point 5]',
      '6. [History point 6]',
      '7. [History point 7]',
      '8. [History point 8]',
      '9. [History point 9]',
      '10. [History point 10]'
    ],
    physExam: [
      '1. General: [Exam point 1]',
      '2. Vitals: [Exam point 2]',
      '3. HEENT/Airway: [Exam point 3]',
      '4. Cardiovascular: [Exam point 4]',
      '5. Respiratory: [Exam point 5]',
      '6. Abdominal: [Exam point 6]',
      '7. Extremities/Skin: [Exam point 7]',
      '8. Neurological: [Exam point 8]',
      '9. [System specific]: [Exam point 9]',
      '10. [System specific]: [Exam point 10]'
    ],
    testCats: [
      { name: 'Point-of-Care & Bedside', icon: '🩺', tests: [
        { n: '[Test Name]', c: true, r: '[Detailed result]' }
      ]},
      { name: 'Hematology Base Panel', icon: '🩸', tests: []},
      { name: 'Coagulation Studies', icon: '⏱️', tests: []},
      { name: 'Chemistry & Metabolic', icon: '🧪', tests: []},
      { name: 'Clinical Microbiology', icon: '🦠', tests: []},
      { name: 'Arterial & Venous Blood Gas', icon: '💉', tests: []},
      { name: 'Radiography', icon: '🩻', tests: []},
      { name: 'Advanced Cross-Sectional Imaging', icon: '📷', tests: []},
      { name: 'Cardiopulmonary Diagnostics', icon: '❤️', tests: []},
      { name: 'Endocrine & Autoimmune', icon: '🧬', tests: []},
      { name: 'Gastroenterology / Hepatic', icon: '胃', tests: []},
      { name: 'Toxicology Screen', icon: '🗑️', tests: []}
      // Note: Must populate these 12 categories with a mix of true/false options
    ],
    diagnoses: [
      { t: '[Correct Diagnosis]', c: true },
      { t: '[Distractor 1]', c: false },
      { t: '[Distractor 2]', c: false },
      { t: '[Distractor 3]', c: false },
      { t: '[Distractor 4]', c: false },
      { t: '[Distractor 5]', c: false },
      { t: '[Distractor 6]', c: false },
      { t: '[Distractor 7]', c: false },
      { t: '[Distractor 8]', c: false },
      { t: '[Distractor 9]', c: false }
    ],
    dxCount: 1,
    treatCats: [
      { name: 'Airway & Oxygenation Support', icon: '🫁', treats: [
        { n: '[Treatment Name]', c: true }
      ]},
      { name: 'Intravenous Fluids & Resuscitation', icon: '💧', treats: []},
      { name: 'Antimicrobial Therapy', icon: '🦠', treats: []},
      { name: 'Systemic Anti-Inflammatories', icon: '💊', treats: []},
      { name: 'Cardiovascular Medications', icon: '❤️', treats: []},
      { name: 'Antithrombotic Therapy', icon: '🩸', treats: []},
      { name: 'Analgesics & Sedation', icon: '🌡️', treats: []},
      { name: 'Gastrointestinal Support', icon: '胃', treats: []},
      { name: 'Metabolic & Endocrine Correction', icon: '🧪', treats: []},
      { name: 'Surgical & Procedural Interventions', icon: '🔪', treats: []},
      { name: 'Reversal Agents & Toxicology', icon: '🚫', treats: []},
      { name: 'Discharge & Preventive Care', icon: '🏥', treats: []}
      // Note: Must populate these 12 categories with a mix of true/false options
    ],
    summary: {
      dx: '[Full Diagnosis Name]',
      sub: '[Pathophysiology subtitle]',
      clues: '[Explanation of history/exam clues]',
      tests: '[Rationale for the correct tests ordered]',
      mgmt: '[Explanation of the treatment plan]',
      pitfalls: '[Why the specific distractors were dangerous/lethal traps]',
      other: '[Why the other diagnoses were wrong]',
      testRationale: '[Deep dive into specific test physiology]',
      treatSeq: '[1. Step → 2. Step → 3. Step]',
      traps: '[Specific clinical traps to avoid]',
      learning: '[Core takeaway message]'
    },
    xp: 40 // Typically 40 for Level 1, 50 for Level 2, 60 for Level 3
  }