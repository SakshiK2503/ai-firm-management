import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiError, toApiErrorResponse } from '@/modules/kernel/errors';
import { requirePermission } from '@/modules/kernel/rbac/enforce';
import { deleteContact, updateContact } from '@/modules/clients/contact.service';

const updateContactSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(200, 'Name is too long').optional(),
    designation: z.string().trim().min(1).nullable().optional(),
    phone: z.string().trim().min(1).nullable().optional(),
    email: z.string().trim().email('Enter a valid email address').nullable().optional(),
    isPrimary: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Provide at least one field to update.',
  });

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; entityId: string; contactId: string }> },
) {
  try {
    const { user } = await requirePermission(request, 'client:editContact');
    const { contactId } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ApiError(400, 'INVALID_JSON', 'Request body must be valid JSON.');
    }

    const data = updateContactSchema.parse(body);
    const contact = await updateContact(user.organisationId, contactId, data);
    return NextResponse.json({ contact });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; entityId: string; contactId: string }> },
) {
  try {
    const { user } = await requirePermission(request, 'client:editContact');
    const { contactId } = await params;
    await deleteContact(user.organisationId, contactId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
