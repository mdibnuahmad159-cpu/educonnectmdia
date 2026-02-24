

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
