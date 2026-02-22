
export type Teacher = {
  id: string; // Firebase Auth UID
  name: string;
  email: string;
  jabatan?: string;
  noWa?: string;
  nik?: string;
  pendidikan?: string;
  ponpes?: string;
  alamat?: string;
  dokumenUrl?: string;
};

export type Student = {
  id: string; // This would be the NIS
  name: string;
  class: string;
};
