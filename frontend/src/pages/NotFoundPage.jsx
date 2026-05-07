import { Link } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import Card from "../components/Card";

export default function NotFoundPage() {
  return (
    <MainLayout>
      <div className="mx-auto max-w-xl py-10">
        <Card className="text-center">
          <h2 className="mb-2 text-2xl font-bold">Page Not Found</h2>
          <Link className="text-primary" to="/">
            Return Home
          </Link>
        </Card>
      </div>
    </MainLayout>
  );
}
