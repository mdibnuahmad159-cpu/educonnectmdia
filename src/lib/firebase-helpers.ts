
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
import type { Teacher, Student } from '@/types';


// The password in the student form is for the parent. This is more complex and
// for now we just store the student data. A real implementation would create a parent user.
export async function addStudent(db: Firestore, student: Omit<Student, 'id'> & {id: string, password?: string}) {
  const { password, ...studentData } = student;
  const studentRef = doc(db, 'students', student.id);
  await setDoc(studentRef, studentData);
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
    // In a real app, you would also delete the Firebase Auth user.
    // This requires admin privileges and is typically a server-side operation.
}
