import type { AuthUser, Role } from "@terasandi/contracts";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserRowActions } from "./user-row-actions";

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeZone: "UTC",
});

/** The account list. Server-rendered; each row mounts its own actions menu. */
export function UsersTable({ users }: { users: AuthUser[] }) {
  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Username</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{user.username}</TableCell>
              <TableCell>
                <RoleBadge role={user.role} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {dateFormatter.format(new Date(user.createdAt))}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end">
                  <UserRowActions user={user} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function RoleBadge({ role }: { role: Role }) {
  return (
    <Badge variant={role === "admin" ? "default" : "secondary"}>{role}</Badge>
  );
}
