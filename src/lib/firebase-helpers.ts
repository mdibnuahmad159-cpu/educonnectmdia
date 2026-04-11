
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
  getDoc,
} from 'firebase/firestore';
import type { Teacher, Student, SchoolProfile, Curriculum, Alumni, Schedule, TeacherAttendance, StudentAttendance, Announcement, Grade, ReportSummary, Certificate, CertificateTemplate, SPPPayment, ExternalSaver, SavingsTransaction } from '@/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


// This function creates a student document in Firestore.
export function addStudent(db: Firestore, student: Omit<Student, 'id'>) {
  const nisString = String(student.nis);
  const prefixedNis = nisString.startsWith('MDIA') ? nisString : `MDIA${nisString}`;
  const studentRef = doc(db, 'students', prefixedNis);
  const data = { ...student, nis: prefixedNis, id: prefixedNis };
  setDoc(studentRef, data).catch(error => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: studentRef.path,
      operation: 'create',
      requestResourceData: data,
    }));
  });
}

export async function addStudentsBatch(db: Firestore, students: Omit<Student, 'id'>[]) {
    if (students.length === 0) return;
    
    const chunks = [];
    for (let i = 0; i < students.length; i += 500) {
        chunks.push(students.slice(i, i + 500));
    }

    for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach(student => {
            const nisString = String(student.nis);
            const prefixedNis = nisString.startsWith('MDIA') ? nisString : `MDIA${nisString}`;
            const studentRef = doc(db, 'students', prefixedNis);
            batch.set(studentRef, { ...student, nis: prefixedNis, id: prefixedNis });
        });
        await batch.commit();
    }
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

export async function addTeacher(db: Firestore, teacher: Omit<Teacher, 'id'>) {
    const nigString = String(teacher.nig).trim();
    const teacherRef = doc(db, 'teachers', nigString);
    const data = {
        ...teacher,
        nig: nigString,
        id: nigString,
        createdAt: serverTimestamp()
    };

    try {
        await setDoc(teacherRef, data);
        return nigString;
    } catch (error) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: teacherRef.path,
            operation: 'create',
            requestResourceData: data,
        }));
        throw error;
    }
}

export async function addTeachersBatch(db: Firestore, teachers: Omit<Teacher, 'id'>[]) {
    if (teachers.length === 0) return;
    
    const chunks = [];
    for (let i = 0; i < teachers.length; i += 500) {
        chunks.push(teachers.slice(i, i + 500));
    }

    for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach(teacherData => {
            const nigString = String(teacherData.nig).trim();
            const teacherRef = doc(db, 'teachers', nigString);
            batch.set(teacherRef, { ...teacherData, nig: nigString, id: nigString, createdAt: serverTimestamp() });
        });
        await batch.commit();
    }
}

/**
 * Updates a teacher. Handles ID migration if NIG changes.
 */
export async function updateTeacher(db: Firestore, teacherId: string, teacherUpdate: Partial<Omit<Teacher, 'id'>>) {
    const oldTeacherRef = doc(db, 'teachers', teacherId);
    
    // If NIG is changing, we need to move the document
    if (teacherUpdate.nig && teacherUpdate.nig !== teacherId) {
        const newNig = String(teacherUpdate.nig).trim();
        const newTeacherRef = doc(db, 'teachers', newNig);
        
        // Check if target exists
        const existingDoc = await getDoc(newTeacherRef);
        if (existingDoc.exists()) {
            throw new Error(`NIG ${newNig} sudah digunakan oleh guru lain.`);
        }

        const oldDoc = await getDoc(oldTeacherRef);
        if (!oldDoc.exists()) throw new Error("Data guru lama tidak ditemukan.");

        const finalData = { 
            ...oldDoc.data(), 
            ...teacherUpdate, 
            id: newNig, 
            nig: newNig,
            updatedAt: serverTimestamp() 
        };

        const batch = writeBatch(db);
        batch.set(newTeacherRef, finalData);
        batch.delete(oldTeacherRef);

        // Update References
        // 1. Schedules
        const schedulesSnap = await getDocs(query(collection(db, "schedules"), where("academicYear", "!=", "")));
        schedulesSnap.forEach(sDoc => {
            const data = sDoc.data() as Schedule;
            const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
            let changed = false;
            days.forEach(day => {
                if (data[day]) {
                    data[day].forEach(entry => {
                        if (entry.teacherId === teacherId) {
                            entry.teacherId = newNig;
                            changed = true;
                        }
                    });
                }
            });
            if (changed) batch.update(sDoc.ref, data as any);
        });

        // 2. Attendance
        const attQuery = query(collection(db, "teacher_attendances"), where("teacherId", "==", teacherId));
        const attSnap = await getDocs(attQuery);
        attSnap.forEach(aDoc => {
            const data = aDoc.data();
            const newAttId = `${newNig}_${data.date}`;
            batch.set(doc(db, "teacher_attendances", newAttId), { ...data, teacherId: newNig, id: newAttId });
            batch.delete(aDoc.ref);
        });

        // 3. Transactions
        const transQuery = query(collection(db, "savingsTransactions"), where("saverId", "==", teacherId));
        const transSnap = await getDocs(transQuery);
        transSnap.forEach(tDoc => {
            batch.update(tDoc.ref, { saverId: newNig });
        });

        await batch.commit();
        return;
    }

    // Standard update if NIG didn't change
    const data = { ...teacherUpdate, updatedAt: serverTimestamp() };
    try {
        await setDoc(oldTeacherRef, data, { merge: true });
    } catch (error) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: oldTeacherRef.path,
            operation: 'update',
            requestResourceData: data,
        }));
        throw error;
    }
}

export function deleteTeacher(db: Firestore, teacherId: string) {
    const teacherRef = doc(db, 'teachers', teacherId);
    deleteDoc(teacherRef).catch(error => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: teacherRef.path,
            operation: 'delete'
        }));
    });
}

/**
 * Normalizes all teachers to have NIG in format MDIAGURU001
 */
export async function normalizeTeacherNIGs(db: Firestore) {
    const snap = await getDocs(collection(db, "teachers"));
    const teachers = snap.docs.map(d => ({ ...d.data(), id: d.id })) as Teacher[];
    
    // Sort to keep consistent ordering
    teachers.sort((a, b) => a.name.localeCompare(b.name));

    for (let i = 0; i < teachers.length; i++) {
        const teacher = teachers[i];
        const targetNig = `MDIAGURU${String(i + 1).padStart(3, '0')}`;
        
        if (teacher.id !== targetNig || teacher.nig !== targetNig) {
            await updateTeacher(db, teacher.id, { nig: targetNig });
        }
    }
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

export async function addCurriculumBatch(db: Firestore, items: Omit<Curriculum, 'id'>[]) {
    if (items.length === 0) return;
    
    const chunks = [];
    for (let i = 0; i < items.length; i += 500) {
        chunks.push(items.slice(i, i + 500));
    }

    for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach(item => {
            const newRef = doc(collection(db, 'curriculum'));
            batch.set(newRef, { ...item, id: newRef.id });
        });
        await batch.commit();
    }
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
            path: 'students/graduate_batch',
            operation: 'write',
            requestResourceData: { studentIds, graduationYear, note: "Batch operation failed." },
        }));
        throw error;
    }
}

export function addAlumnus(db: Firestore, alumnusData: Omit<Alumni, 'id'>) {
  const newRef = doc(collection(db, 'alumni'));
  let finalNis = alumnusData.nis?.trim();
  
  if (!finalNis) {
    // Generate random alphanumeric NIS starting with 'AL'
    finalNis = 'AL' + Math.random().toString(36).substring(2, 9).toUpperCase();
  } else if (!finalNis.startsWith('MDIA')) {
    finalNis = `MDIA${finalNis}`;
  }

  const data = { ...alumnusData, nis: finalNis, id: newRef.id };
  setDoc(newRef, data).catch(error => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: newRef.path,
      operation: 'create',
      requestResourceData: data,
    }));
  });
}

export async function addAlumniBatch(db: Firestore, alumni: Omit<Alumni, 'id'>[]) {
    if (alumni.length === 0) return;
    
    const chunks = [];
    for (let i = 0; i < alumni.length; i += 500) {
        chunks.push(alumni.slice(i, i + 500));
    }

    for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach(alumnusData => {
            const newRef = doc(collection(db, 'alumni'));
            let finalNis = alumnusData.nis?.trim();
            
            if (!finalNis) {
                finalNis = 'AL' + Math.random().toString(36).substring(2, 10).toUpperCase();
            } else if (!finalNis.startsWith('MDIA')) {
                finalNis = `MDIA${finalNis}`;
            }

            batch.set(newRef, { ...alumnusData, nis: finalNis, id: newRef.id });
        });
        await batch.commit();
    }
}

export function updateAlumnus(db: Firestore, alumnusId: string, alumnusData: Partial<Omit<Alumni, 'id'>>) {
  const alumnusRef = doc(db, 'alumni', alumnusId);
  const data = { ...alumnusData };
  
  // If NIS is provided manually and doesn't have the prefix, add it.
  // Unless it's an auto-generated 'AL' NIS.
  if (data.nis && !data.nis.startsWith('MDIA') && !data.nis.startsWith('AL')) {
      data.nis = `MDIA${data.nis}`;
  }

  setDoc(alumnusRef, data, { merge: true }).catch(error => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: alumnusRef.path,
      operation: 'update',
      requestResourceData: data,
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

export function upsertSchedule(db: Firestore, schedule: Schedule) {
    const scheduleRef = doc(db, 'schedules', schedule.id);
    setDoc(scheduleRef, schedule, { merge: true }).catch(error => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: scheduleRef.path,
            operation: 'write',
            requestResourceData: schedule
        }));
    });
}

export function saveTeacherAttendanceBatch(db: Firestore, attendances: Omit<TeacherAttendance, 'id'>[]) {
    const batch = writeBatch(db);

    attendances.forEach(att => {
        const attendanceId = `${att.teacherId}_${att.date}`;
        const attendanceRef = doc(db, 'teacher_attendances', attendanceId);
        const data = { ...att, id: attendanceId };
        batch.set(attendanceRef, data);
    });
    
    return batch.commit().catch(error => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: 'teacher_attendances/batch_save',
            operation: 'write',
            requestResourceData: { note: "Batch write failed for teacher attendance" }
        }));
        throw error;
    });
}

export function saveStudentAttendanceBatch(db: Firestore, attendances: Omit<StudentAttendance, 'id'>[]) {
    const batch = writeBatch(db);

    attendances.forEach(att => {
        const attendanceId = `${att.studentId}_${att.date}`;
        const attendanceRef = doc(db, 'student_attendances', attendanceId);
        const data = { ...att, id: attendanceId };
        batch.set(attendanceRef, data);
    });
    
    return batch.commit().catch(error => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: 'student_attendances/batch_save',
            operation: 'write',
            requestResourceData: { note: "Batch write failed for student attendance" }
        }));
        throw error;
    });
}

export function addAnnouncement(db: Firestore, announcement: Omit<Announcement, 'id' | 'createdAt'>) {
  const newRef = doc(collection(db, 'announcements'));
  const data = {
    ...announcement,
    id: newRef.id,
    createdAt: new Date().toISOString(),
  };
  setDoc(newRef, data).catch(error => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: newRef.path,
      operation: 'create',
      requestResourceData: data,
    }));
  });
}

export function updateAnnouncement(db: Firestore, id: string, announcement: Partial<Omit<Announcement, 'id'>>) {
  const ref = doc(db, 'announcements', id);
  setDoc(ref, announcement, { merge: true }).catch(error => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: ref.path,
      operation: 'update',
      requestResourceData: announcement,
    }));
  });
}

export function deleteAnnouncement(db: Firestore, id: string) {
  const ref = doc(db, 'announcements', id);
  deleteDoc(ref).catch(error => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: ref.path,
      operation: 'delete',
    }));
  });
}

export function saveGradesBatch(db: Firestore, grades: Omit<Grade, 'id' | 'updatedAt'>[], reportSummaries?: Omit<ReportSummary, 'updatedAt'>[]) {
  const batch = writeBatch(db);
  const now = new Date().toISOString();

  grades.forEach(grade => {
    const gradeId = `${grade.studentId}_${grade.subjectId}_${grade.type}_${grade.academicYear.replace(/\//g, '-')}`;
    const gradeRef = doc(db, 'grades', gradeId);
    batch.set(gradeRef, {
      ...grade,
      id: gradeId,
      updatedAt: now,
    }, { merge: true });
  });

  if (reportSummaries) {
    reportSummaries.forEach(summary => {
        const summaryId = `${summary.studentId}_${summary.semester}_${summary.academicYear.replace(/\//g, '-')}`;
        const summaryRef = doc(db, 'report_summaries', summaryId);
        batch.set(summaryRef, {
            ...summary,
            id: summaryId,
            updatedAt: now,
        }, { merge: true });
    });
  }

  return batch.commit().catch(error => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: 'grades/batch_save',
      operation: 'write',
      requestResourceData: { note: "Batch save failed" },
    }));
    throw error;
  });
}

export function addCertificate(db: Firestore, certificate: Omit<Certificate, 'id'>) {
  const newRef = doc(collection(db, 'certificates'));
  const data = { ...certificate, id: newRef.id };
  setDoc(newRef, data).catch(error => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: newRef.path,
      operation: 'create',
      requestResourceData: data,
    }));
  });
}

export async function addCertificatesBatch(db: Firestore, certificates: Omit<Certificate, 'id'>[]) {
    if (certificates.length === 0) return;
    
    const chunks = [];
    for (let i = 0; i < certificates.length; i += 500) {
        chunks.push(certificates.slice(i, i + 500));
    }

    for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach(c => {
            const newRef = doc(collection(db, 'certificates'));
            batch.set(newRef, { ...c, id: newRef.id });
        });
        await batch.commit();
    }
}

export function updateCertificate(db: Firestore, id: string, certificate: Partial<Omit<Certificate, 'id'>>) {
  const ref = doc(db, 'certificates', id);
  setDoc(ref, certificate, { merge: true }).catch(error => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: ref.path,
      operation: 'update',
      requestResourceData: certificate,
    }));
  });
}

export function deleteCertificate(db: Firestore, id: string) {
  const ref = doc(db, 'certificates', id);
  deleteDoc(ref).catch(error => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: ref.path,
      operation: 'delete',
    }));
  });
}

export function upsertCertificateTemplate(db: Firestore, template: CertificateTemplate) {
  const ref = doc(db, 'certificate_templates', template.id);
  return setDoc(ref, template).catch(error => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: ref.path,
      operation: 'write',
      requestResourceData: template,
    }));
    throw error;
  });
}

/**
 * Saves SPP payment using a deterministic ID: studentId_month_year
 * This ensures reliability and prevents duplicates.
 */
export function saveSPPPayment(db: Firestore, payment: Omit<SPPPayment, 'id'>) {
    const paymentId = `${payment.studentId}_${payment.month}_${payment.year}`;
    const paymentRef = doc(db, 'sppPayments', paymentId);
    
    const data = {
        ...payment,
        id: paymentId,
        updatedAt: serverTimestamp()
    };

    return setDoc(paymentRef, data, { merge: true }).catch(error => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: paymentRef.path,
            operation: 'write',
            requestResourceData: data
        }));
        throw error;
    });
}

/**
 * Deletes SPP payment using deterministic ID logic as a fallback,
 * but prefers an explicit ID if provided.
 */
export function deleteSPPPayment(db: Firestore, studentId: string, month: number, year: number, explicitId?: string) {
    const paymentId = explicitId || `${studentId}_${month}_${year}`;
    const paymentRef = doc(db, 'sppPayments', paymentId);
    
    return deleteDoc(paymentRef).catch(error => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: paymentRef.path,
            operation: 'delete',
        }));
        throw error;
    });
}

// External Saver Helpers
export function addExternalSaver(db: Firestore, saver: Omit<ExternalSaver, 'id'>) {
  const newRef = doc(collection(db, 'externalSavers'));
  const data = {
    ...saver,
    id: newRef.id,
    createdAt: new Date().toISOString()
  };
  setDoc(newRef, data).catch(error => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: newRef.path,
      operation: 'create',
      requestResourceData: data,
    }));
  });
}

export function updateExternalSaver(db: Firestore, id: string, saver: Partial<ExternalSaver>) {
  const ref = doc(db, 'externalSavers', id);
  setDoc(ref, saver, { merge: true }).catch(error => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: ref.path,
      operation: 'update',
      requestResourceData: saver,
    }));
  });
}

export function deleteExternalSaver(db: Firestore, id: string) {
  const ref = doc(db, 'externalSavers', id);
  deleteDoc(ref).catch(error => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: ref.path,
      operation: 'delete',
    }));
  });
}

// Savings Transaction Helpers
export function addSavingsTransaction(db: Firestore, transaction: Omit<SavingsTransaction, 'id'>) {
  const newRef = doc(collection(db, 'savingsTransactions'));
  const data = {
    ...transaction,
    id: newRef.id,
    date: transaction.date || new Date().toISOString()
  };
  return setDoc(newRef, data).catch(error => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: newRef.path,
      operation: 'create',
      requestResourceData: data,
    }));
    throw error;
  });
}

export function deleteSavingsTransaction(db: Firestore, id: string) {
  const ref = doc(db, 'savingsTransactions', id);
  return deleteDoc(ref).catch(error => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: ref.path,
      operation: 'delete',
    }));
  });
}
