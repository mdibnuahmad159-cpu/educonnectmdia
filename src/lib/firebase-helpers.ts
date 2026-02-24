
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
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


// This function creates a student document in Firestore.
export function addStudent(db: Firestore, student: Omit<Student, 'id'>) {
  const studentRef = doc(db, 'students', student.nis);
  const data = { ...student, id: student.nis };
  setDoc(studentRef, data).catch(error => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: studentRef.path,
      operation: 'create',
      requestResourceData: data,
    }));
  });
}

export function updateStudent(db: Firestore, studentId: string, student: Partial<Student>) {
  const studentRef = doc(db, 'students', studentId);
  setDoc(studentRef, student, { merge: true }).catch(error => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: studentRef.path,
      operation: 'update',
      requestResourceData: student,
    }));
  });
}

export function deleteStudent(db: Firestore, studentId: string) {
  const studentRef = doc(db, 'students', studentId);
  deleteDoc(studentRef).catch(error => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: studentRef.path,
      operation: 'delete',
    }));
  });
}

// For teachers, we create an auth user and a firestore document.
// This client-side flow logs the new teacher in and logs the admin out.
// In a production app, creating users is typically a server-side (admin) operation.
export async function addTeacher(auth: Auth, db: Firestore, teacher: Omit<Teacher, 'id'> & {password: string}) {
    const userCredential = await createUserWithEmailAndPassword(auth, teacher.email, teacher.password);
    const user = userCredential.user;
    
    const { password, ...teacherData } = teacher;

    const teacherRef = doc(db, 'teachers', user.uid);
    const data = {
        ...teacherData,
        id: user.uid,
        createdAt: serverTimestamp()
    };

    try {
        await setDoc(teacherRef, data);
    } catch (error) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: teacherRef.path,
            operation: 'create',
            requestResourceData: data,
        }));
        // Re-throw so the UI can catch it and show the toast
        throw error;
    }
    
    return user.uid;
}

export function updateTeacher(db: Firestore, teacherId: string, teacher: Partial<Omit<Teacher, 'id'>>) {
    const { password, ...teacherData } = teacher as any;
    const teacherRef = doc(db, 'teachers', teacherId);
    const data = { ...teacherData, updatedAt: serverTimestamp() };
    setDoc(teacherRef, data, { merge: true }).catch(error => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: teacherRef.path,
          operation: 'update',
          requestResourceData: data
        }));
    });
}

export function deleteTeacher(db: Firestore, teacherId: string) {
    const teacherRef = doc(db, 'teachers', teacherId);
    deleteDoc(teacherRef).catch(error => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: teacherRef.path,
          operation: 'delete'
        }));
    });
    // IMPORTANT: This only deletes the Firestore document, not the Firebase Authentication user.
    // Deleting auth users requires admin privileges and should be handled in a secure server environment (e.g., Firebase Functions).
}

export function updateSchoolProfile(db: Firestore, profileData: Partial<Omit<SchoolProfile, 'id'>>) {
  const profileRef = doc(db, 'schoolProfile', 'main');
  const data = { ...profileData, updatedAt: serverTimestamp() };
  setDoc(profileRef, data, { merge: true }).catch(error => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: profileRef.path,
      operation: 'update',
      requestResourceData: data,
    }));
  });
}

// Curriculum Helpers
export function addCurriculum(db: Firestore, curriculum: Omit<Curriculum, 'id'>) {
  const newCurriculumRef = doc(collection(db, 'curriculum'));
  const data = { ...curriculum, id: newCurriculumRef.id };
  setDoc(newCurriculumRef, data).catch(error => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: newCurriculumRef.path,
      operation: 'create',
      requestResourceData: data,
    }));
  });
}

export function updateCurriculum(db: Firestore, curriculumId: string, curriculum: Partial<Omit<Curriculum, 'id'>>) {
  const curriculumRef = doc(db, 'curriculum', curriculumId);
  setDoc(curriculumRef, curriculum, { merge: true }).catch(error => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: curriculumRef.path,
      operation: 'update',
      requestResourceData: curriculum,
    }));
  });
}

export function deleteCurriculum(db: Firestore, curriculumId: string) {
  const curriculumRef = doc(db, 'curriculum', curriculumId);
  deleteDoc(curriculumRef).catch(error => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: curriculumRef.path,
      operation: 'delete',
    }));
  });
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
            reportUrl: studentData.reportUrl,
        };
        batch.set(alumniRef, alumniData);
        batch.delete(studentDoc.ref);
    });

    try {
        await batch.commit();
    } catch (error) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: '[BATCH-WRITE] /students -> /alumni',
            operation: 'write',
            requestResourceData: { studentIds, graduationYear, note: "Batch operation failed." },
        }));
        throw error;
    }
}

export function addAlumnus(db: Firestore, alumnusData: Omit<Alumni, 'id'>) {
  // Use NIS as the document ID for simplicity
  const alumnusRef = doc(db, 'alumni', alumnusData.nis);
  const data = { ...alumnusData, id: alumnusData.nis };
  setDoc(alumnusRef, data).catch(error => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: alumnusRef.path,
      operation: 'create',
      requestResourceData: data,
    }));
  });
}

export function updateAlumnus(db: Firestore, alumnusId: string, alumnusData: Partial<Omit<Alumni, 'id'>>) {
  const alumnusRef = doc(db, 'alumni', alumnusId);
  setDoc(alumnusRef, alumnusData, { merge: true }).catch(error => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: alumnusRef.path,
      operation: 'update',
      requestResourceData: alumnusData,
    }));
  });
}


export function deleteAlumnus(db: Firestore, alumnusId: string) {
  const alumnusRef = doc(db, 'alumni', alumnusId);
  deleteDoc(alumnusRef).catch(error => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: alumnusRef.path,
      operation: 'delete',
    }));
  });
}
