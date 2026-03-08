
export type Teacher = {
  id: string; // Firebase Auth UID
  name: string;
  email: string;
  avatarUrl?: string;
  dokumenUrl?: string;
  jabatan?: string;
  noWa?: string;
  nik?: string;
  pendidikan?: string;
  ponpes?: string;
  alamat?: string;
  password?: string;
};

export type Student = {
  id: string; // Document ID, can be same as NIS
  name: string;
  nis: string;
  nik?: string;
  gender: "Laki-laki" | "Perempuan";
  tempatLahir?: string;
  dateOfBirth: string;
  namaAyah?: string;
  namaIbu?: string;
  address: string;
  avatarUrl?: string;
  dokumenUrl?: string;
  password?: string;
  kelas?: number;
  noWa?: string;
  reportUrl?: string;
};

export type Alumni = {
  id: string;
  nis: string;
  name: string;
  tahunLulus: string;
  address?: string;
  noWa?: string;
  reportUrl?: string;
};

export type SchoolProfile = {
  id: 'main';
  namaYayasan?: string;
  namaMadrasah?: string;
  nsdt?: string;
  alamat?: string;
  visi?: string;
  misi?: string;
  sejarahSingkat?: string;
  logoYayasanUrl?: string;
  logoMadrasahUrl?: string;
  kopSuratUrl?: string;
  activeAcademicYear?: string;
  defaultSppAmount?: number;
};

export type Curriculum = {
  id: string;
  subjectCode: string;
  subjectName: string;
  classLevel: number;
  bookName?: string;
};

export type ScheduleEntry = {
  type: 'subject' | 'break';
  startTime: string;
  endTime: string;
  subjectId?: string;
  teacherId?: string;
};

export type Schedule = {
  id: string; // e.g. {classLevel}_{academicYear}_{scheduleType}
  classLevel: number;
  academicYear: string;
  type: 'pelajaran' | 'ujian';
  saturday: ScheduleEntry[];
  sunday: ScheduleEntry[];
  monday: ScheduleEntry[];
  tuesday: ScheduleEntry[];
  wednesday: ScheduleEntry[];
  thursday: ScheduleEntry[];
};

export type TeacherAttendance = {
  id: string; // composite key: `${teacherId}_${date}`
  teacherId: string;
  teacherName: string; // Denormalized
  date: string; // YYYY-MM-DD
  status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa';
};

export type StudentAttendance = {
  id: string; // composite key: `${studentId}_${date}`
  studentId: string;
  studentName: string;
  nis: string;
  kelas: number;
  date: string; // YYYY-MM-DD
  status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa';
};

export type Announcement = {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  linkUrl?: string;
  target: 'Semua' | 'Guru' | 'Wali Murid';
  createdAt: string;
};

export type Grade = {
  id: string;
  studentId: string;
  subjectId: string;
  academicYear: string;
  type: 'Ganjil' | 'Genap';
  score: number;
  updatedAt: string;
};

export type ReportSummaryStatus = 'Naik Kelas' | 'Turun Kelas' | 'Lanjut Semester';

export type ReportSummary = {
  id: string;
  studentId: string;
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  status: ReportSummaryStatus;
  sakit?: number;
  izin?: number;
  alpa?: number;
  updatedAt: string;
};

export type CertificateRank = 'Pertama' | 'Kedua' | 'Ketiga';
export type CertificateCategory = 'lomba' | 'ranking' | 'bintang';

export type Certificate = {
  id: string;
  studentId: string;
  studentName: string;
  category: CertificateCategory;
  rank: CertificateRank;
  competitionName?: string; // Optional for non-lomba
  date: string;
  academicYear: string;
};

export type CertificateTemplate = {
  id: CertificateCategory;
  imageUrl: string;
};

export type SPPPaymentStatus = 'Paid' | 'Unpaid' | 'Partial';

export type SPPPayment = {
  id: string;
  studentId: string;
  classId: string;
  month: number;
  year: number;
  amountDue: number;
  amountPaid: number;
  paymentDate: string;
  status: SPPPaymentStatus;
  notes?: string;
  updatedAt?: any;
};

export type ExternalSaver = {
  id: string;
  name: string;
  address?: string;
  phoneNumber?: string;
  notes?: string;
  createdAt?: string;
};

export type SavingsTransactionType = 'deposit' | 'withdraw';
export type SaverType = 'student' | 'teacher' | 'external';

export type SavingsTransaction = {
  id: string;
  saverId: string;
  saverType: SaverType;
  type: SavingsTransactionType;
  amount: number;
  date: string;
  notes?: string;
};
