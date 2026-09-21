import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiError, toApiErrorResponse } from '@/modules/kernel/errors';
import { requirePermission } from '@/modules/kernel/rbac/enforce';
import { roleHasPermission } from '@/modules/kernel/rbac/permissions';
import { createContact, listContactsForEntity } from '@/modules/clients/contact.service';

const createContactSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200, 'Name is too long'),
  designation: z.string().trim().min(1).optional(),
  phone: z.string().trim().min(1).optional(),
  email: z.string().trim().email('Enter a valid email address').optional(),
  isPrimary: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; entityId: string }> },
) {
  try {
    const { user } = await requirePermission(request, 'client:view');
    const canViewAll = user.roleId ? await roleHasPermission(user.roleId, 'client:viewAll') : false;
    if (!canViewAll) {
      throw new ApiError(404, 'NOT_FOUND', 'Entity not found.');
    }

    const { entityId } = await params;
    const contacts = await listContactsForEntity(user.organisationId, entityId);
    return NextResponse.json({ contacts });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; entityId: string }> },
) {
  try {
    const { user } = await requirePermission(request, 'client:editContact');
    const { entityId } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ApiError(400, 'INVALID_JSON', 'Request body must be valid JSON.');
    }

    const input = createContactSchema.parse(body);
    const contact = await createContact(user.organisationId, { entityId, ...input });
    return NextResponse.json({ contact }, { status: 201 });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
