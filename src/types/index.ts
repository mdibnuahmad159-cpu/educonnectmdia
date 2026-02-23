
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
