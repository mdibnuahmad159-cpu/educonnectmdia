import { StudentManagement } from "../dashboard/components/student-management";

export default function StudentsPage() {
    return (
        <div className="grid flex-1 items-start gap-4">
            <StudentManagement />
        </div>
    )
}
