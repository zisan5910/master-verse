import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Course } from "@/types";
import { Link } from "react-router-dom";
import { FloatingButtons } from "@/components/FloatingButtons";
import { CourseGridSkeleton } from "@/components/skeletons/CourseCardSkeleton";

export default function HomePage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const snap = await getDocs(collection(db, "courses"));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Course));
      list.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
      setCourses(list);
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) {
    return <div className="p-4"><h2 className="text-xl font-semibold text-foreground mb-4">All Courses</h2><CourseGridSkeleton count={6} /></div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold text-foreground mb-4">All Courses</h2>
      {courses.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">No courses available yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course) => (
            <div key={course.id} className="bg-card rounded-lg shadow-card overflow-hidden border border-border hover:shadow-md transition-shadow">
              {course.thumbnail ? (
                <img src={course.thumbnail} alt={course.courseName} className="w-full aspect-video object-cover" />
              ) : (
                <div className="w-full aspect-video bg-muted flex items-center justify-center"><span className="text-muted-foreground">No Image</span></div>
              )}
              <div className="p-4">
                <h3 className="font-semibold text-foreground text-lg line-clamp-2">{course.courseName}</h3>
                <p className="text-muted-foreground mt-1 font-medium">৳{course.price}</p>
                <Link to={`/course/${course.id}`} className="inline-block mt-3 px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity">View Details</Link>
              </div>
            </div>
          ))}
        </div>
      )}
      <FloatingButtons />
    </div>
  );
}
