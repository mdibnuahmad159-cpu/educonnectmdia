
import {
  Auth,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import {
  Firestore,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  collection,
  writeBatch,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import type { Teacher, Student, SchoolProfile, Curriculum, Alumni } from '@/types';


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

// Curriculum Helpers
export async function addCurriculum(db: Firestore, curriculum: Omit<Curriculum, 'id'>) {
  const newCurriculumRef = doc(collection(db, 'curriculum'));
  await setDoc(newCurriculumRef, { ...curriculum, id: newCurriculumRef.id });
}

export async function updateCurriculum(db: Firestore, curriculumId: string, curriculum: Partial<Omit<Curriculum, 'id'>>) {
  const curriculumRef = doc(db, 'curriculum', curriculumId);
  await setDoc(curriculumRef, curriculum, { merge: true });
}

export async function deleteCurriculum(db: Firestore, curriculumId: string) {
  const curriculumRef = doc(db, 'curriculum', curriculumId);
  await deleteDoc(curriculumRef);
}

// Alumni Helpers
export async function graduateStudents(db: Firestore, studentIds: string[], graduationYear: string) {
    if (studentIds.length === 0) return;

    const batch = writeBatch(db);
    const studentsRef = collection(db, 'students');
    const q = query(studentsRef, where('id', 'in', studentIds));
    
    const studentSnapshots = await getDocs(q);

    studentSnapshots.forEach(studentDoc => {
        const studentData = studentDoc.data() as Student;

        const alumniRef = doc(db, 'alumni', studentData.id);
        const alumniData: Alumni = {
            id: studentData.id,
            nis: studentData.nis,
            name: studentData.name,
            tahunLulus: graduationYear,
            address: studentData.address,
            noWa: studentData.noWa,
        };
        batch.set(alumniRef, alumniData);
        batch.delete(studentDoc.ref);
    });

    await batch.commit();
}

export async function deleteAlumnus(db: Firestore, alumnusId: string) {
  const alumnusRef = doc(db, 'alumni', alumnusId);
  await deleteDoc(alumnusRef);
}
