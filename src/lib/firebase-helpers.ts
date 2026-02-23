
import {
  Auth,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import {
  Firestore,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import type { Teacher, Student, SchoolProfile } from '@/types';


// This function creates a student document in Firestore.
export async function addStudent(db: Firestore, student: Omit<Student, 'id'>) {
  // Use the student's NIS as the document ID for simplicity, and also as the 'id' field.
  const studentRef = doc(db, 'students', student.nis);
  await setDoc(studentRef, { ...student, id: student.nis });
}

export async function updateStudent(db: Firestore, studentId: string, student: Partial<Student>) {
  const studentRef = doc(db, 'students', studentId);
  await setDoc(studentRef, student, { merge: true });
}

export async function deleteStudent(db: Firestore, studentId: string) {
  const studentRef = doc(db, 'students', studentId);
  await deleteDoc(studentRef);
}

// For teachers, we create an auth user and a firestore document.
// This client-side flow logs the new teacher in and logs the admin out.
// In a production app, creating users is typically a server-side (admin) operation.
export async function addTeacher(auth: Auth, db: Firestore, teacher: Omit<Teacher, 'id'> & {password: string}) {
    const userCredential = await createUserWithEmailAndPassword(auth, teacher.email, teacher.password);
    const user = userCredential.user;
    
    const { password, ...teacherData } = teacher;

    const teacherRef = doc(db, 'teachers', user.uid);
    await setDoc(teacherRef, {
        ...teacherData,
        id: user.uid,
        createdAt: serverTimestamp()
    });
    return user.uid;
}

export async function updateTeacher(db: Firestore, teacherId: string, teacher: Partial<Omit<Teacher, 'id'>>) {
    const { password, ...teacherData } = teacher as any;
    const teacherRef = doc(db, 'teachers', teacherId);
    await setDoc(teacherRef, { ...teacherData, updatedAt: serverTimestamp() }, { merge: true });
}

export async function deleteTeacher(db: Firestore, teacherId: string) {
    const teacherRef = doc(db, 'teachers', teacherId);
    await deleteDoc(teacherRef);
    // IMPORTANT: This only deletes the Firestore document, not the Firebase Authentication user.
    // Deleting auth users requires admin privileges and should be handled in a secure server environment (e.g., Firebase Functions).
}

export async function updateSchoolProfile(db: Firestore, profileData: Partial<Omit<SchoolProfile, 'id'>>) {
  const profileRef = doc(db, 'schoolProfile', 'main');
  await setDoc(profileRef, { ...profileData, updatedAt: serverTimestamp() }, { merge: true });
}
