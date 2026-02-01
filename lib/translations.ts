export type Language = 'en' | 'th';

export const translations = {
  en: {
    // App title
    appTitle: 'RC Beam Analysis',
    appSubtitle: 'Shear and Moment Strength by WSD & SDM',

    // Homepage
    selectBeamType: 'Select Beam Type',
    selectBeamTypeDesc: 'Choose the type of reinforced concrete beam to analyze',
    singleBeam: 'Singly Reinforced Beam',
    singleBeamDesc: 'Beam with tension reinforcement only at the bottom',
    doubleBeam: 'Doubly Reinforced Beam',
    doubleBeamDesc: 'Beam with both tension and compression reinforcement',
    calculate: 'Calculate',
    backToHome: '← Back to Home',

    // Features
    featureAccurate: 'Accurate Calculations',
    featureAccurateDesc: 'Based on WSD & SDM standards',
    featureRealtime: 'Real-time Results',
    featureRealtimeDesc: 'Instant calculation as you type',
    featureBilingual: 'Bilingual Support',
    featureBilingualDesc: 'Available in English and Thai',

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
    tensionReinforcement: 'Tension Reinforcement (Bottom)',
    compressionReinforcement: 'Compression Reinforcement (Top)',
    mainBars: 'Main Bars',
    topBars: 'Top Bars',
    bottomBars: 'Bottom Bars',
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
    tensionSteelArea: 'Tension Steel Area',
    compressionSteelArea: 'Compression Steel Area',
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

    // Double beam specific
    compressionSteelYields: 'Compression Steel Yields',
    compressionSteelNotYields: 'Compression Steel Not Yields',
    dPrime: 'd\'',
    asPrime: 'As\'',

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

    // Homepage
    selectBeamType: 'เลือกประเภทคาน',
    selectBeamTypeDesc: 'เลือกประเภทคานคอนกรีตเสริมเหล็กที่ต้องการวิเคราะห์',
    singleBeam: 'คานเสริมเหล็กชั้นเดียว',
    singleBeamDesc: 'คานที่มีเหล็กรับแรงดึงด้านล่างเท่านั้น',
    doubleBeam: 'คานเสริมเหล็กสองชั้น',
    doubleBeamDesc: 'คานที่มีทั้งเหล็กรับแรงดึงและเหล็กรับแรงอัด',
    calculate: 'คำนวณ',
    backToHome: '← กลับหน้าหลัก',

    // Features
    featureAccurate: 'คำนวณแม่นยำ',
    featureAccurateDesc: 'ตามมาตรฐาน WSD & SDM',
    featureRealtime: 'ผลลัพธ์ทันที',
    featureRealtimeDesc: 'คำนวณอัตโนมัติขณะพิมพ์',
    featureBilingual: 'รองรับ 2 ภาษา',
    featureBilingualDesc: 'ภาษาไทยและอังกฤษ',

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
    tensionReinforcement: 'เหล็กรับแรงดึง (ล่าง)',
    compressionReinforcement: 'เหล็กรับแรงอัด (บน)',
    mainBars: 'เหล็กเสริมหลัก',
    topBars: 'เหล็กบน',
    bottomBars: 'เหล็กล่าง',
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
    tensionSteelArea: 'พื้นที่เหล็กรับแรงดึง',
    compressionSteelArea: 'พื้นที่เหล็กรับแรงอัด',
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

    // Double beam specific
    compressionSteelYields: 'เหล็กอัดครากตัว',
    compressionSteelNotYields: 'เหล็กอัดไม่ครากตัว',
    dPrime: 'd\'',
    asPrime: 'As\'',

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
