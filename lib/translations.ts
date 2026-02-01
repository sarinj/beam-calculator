export type Language = 'en' | 'th';

export const translations = {
  en: {
    // App title
    appTitle: 'RC Beam Analysis',
    appSubtitle: 'Shear and Moment Strength by WSD & SDM',

    // Material properties
    materialProperties: 'Material Properties',
    concreteStrength: 'Concrete Strength',
    steelGrade: 'Steel Grade',

    // Section dimensions
    sectionDimensions: 'Section Dimensions',
    width: 'Width',
    height: 'Height',
    cover: 'Cover',

    // Reinforcement
    reinforcement: 'Reinforcement',
    mainBars: 'Main Bars',
    layer: 'Layer',
    barSize: 'Bar Size',
    quantity: 'Quantity',
    bars: 'bars',
    addLayer: 'Add Layer',
    removeLayer: 'Remove',
    stirrups: 'Stirrups',
    spacing: 'Spacing',

    // Results
    results: 'Results',
    effectiveDepth: 'Effective Depth',
    steelArea: 'Steel Area',
    steelRatio: 'Steel Ratio',
    momentCapacity: 'Moment Capacity',
    shearCapacity: 'Shear Capacity',

    // WSD specific
    wsdMethod: 'WSD Method',
    allowableStresses: 'Allowable Stresses',
    allowableConcrete: 'Allowable fc',
    allowableSteel: 'Allowable fs',
    modularRatio: 'Modular Ratio',
    neutralAxis: 'Neutral Axis',
    leverArm: 'Lever Arm',

    // SDM specific
    sdmMethod: 'SDM Method',
    beta1: 'Beta 1',
    balancedRatio: 'Balanced Ratio',
    maxRatio: 'Max Ratio',
    compressionBlock: 'Compression Block',
    nominalMoment: 'Nominal Moment',
    designMoment: 'Design Moment',
    nominalShear: 'Nominal Shear',
    designShear: 'Design Shear',
    status: 'Status',
    underReinforced: 'Under-reinforced (OK)',
    overReinforced: 'Over-reinforced (NG)',

    // Units
    cm: 'cm',
    cm2: 'cm²',
    kgm: 'kg-m',
    kg: 'kg',
    kgcm2: 'kg/cm²',

    // Language toggle
    language: 'Language',
  },
  th: {
    // App title
    appTitle: 'วิเคราะห์คานคอนกรีตเสริมเหล็ก',
    appSubtitle: 'กำลังรับแรงเฉือนและโมเมนต์ โดยวิธี WSD & SDM',

    // Material properties
    materialProperties: 'คุณสมบัติวัสดุ',
    concreteStrength: 'กำลังคอนกรีต',
    steelGrade: 'เหล็กเสริม',

    // Section dimensions
    sectionDimensions: 'หน้าตัดคาน',
    width: 'ความกว้าง',
    height: 'ความสูง',
    cover: 'ระยะหุ้ม',

    // Reinforcement
    reinforcement: 'เหล็กเสริม',
    mainBars: 'เหล็กเสริมหลัก',
    layer: 'ชั้นที่',
    barSize: 'ขนาดเหล็ก',
    quantity: 'จำนวน',
    bars: 'เส้น',
    addLayer: 'เพิ่มชั้น',
    removeLayer: 'ลบ',
    stirrups: 'เหล็กปลอก',
    spacing: 'ระยะห่าง',

    // Results
    results: 'ผลการคำนวณ',
    effectiveDepth: 'ความลึกประสิทธิผล',
    steelArea: 'พื้นที่เหล็ก',
    steelRatio: 'อัตราส่วนเหล็ก',
    momentCapacity: 'กำลังรับโมเมนต์',
    shearCapacity: 'กำลังรับแรงเฉือน',

    // WSD specific
    wsdMethod: 'วิธี WSD',
    allowableStresses: 'หน่วยแรงที่ยอมให้',
    allowableConcrete: 'fc ที่ยอมให้',
    allowableSteel: 'fs ที่ยอมให้',
    modularRatio: 'อัตราส่วนโมดูลัส',
    neutralAxis: 'แกนสะเทิน',
    leverArm: 'แขนโมเมนต์',

    // SDM specific
    sdmMethod: 'วิธี SDM',
    beta1: 'เบต้า 1',
    balancedRatio: 'อัตราส่วนสมดุล',
    maxRatio: 'อัตราส่วนสูงสุด',
    compressionBlock: 'บล็อกอัด',
    nominalMoment: 'โมเมนต์ระบุ',
    designMoment: 'โมเมนต์ออกแบบ',
    nominalShear: 'แรงเฉือนระบุ',
    designShear: 'แรงเฉือนออกแบบ',
    status: 'สถานะ',
    underReinforced: 'เหล็กน้อยกว่าสมดุล (OK)',
    overReinforced: 'เหล็กมากกว่าสมดุล (NG)',

    // Units
    cm: 'ซม.',
    cm2: 'ซม.²',
    kgm: 'กก.-ม.',
    kg: 'กก.',
    kgcm2: 'กก./ซม.²',

    // Language toggle
    language: 'ภาษา',
  },
} as const;

export type TranslationKey = keyof typeof translations.en;
