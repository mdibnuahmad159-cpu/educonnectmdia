
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
};
