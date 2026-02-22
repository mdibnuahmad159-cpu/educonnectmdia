
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
  id: string; // Document ID, can be same as NIS
  nis: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: "Laki-laki" | "Perempuan";
  address: string;
  enrollmentDate: string;
  classId: string;
  // In a real app, you would have a parent/guardian relationship
  // parentIds?: string[];
};

