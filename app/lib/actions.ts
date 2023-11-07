'use server';

import { z } from 'zod'
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const InvoiceSchema = z.object({
	id: z.string(),
	// below message for invalid type error
	customerId: z.string({ invalid_type_error: 'Please select a customer.' })
		// below messages for specific errors, they all show if the condition is met
		.refine(value => value.length < 3, {
			message: 'Customer ID should have more than 3 characters.',
		})
		.refine(value => value.length < 5, {
			message: 'Customer ID should have more than 5 characters.',
		}),
	amount: z.coerce
		.number()
		.gt(0, { message: 'Please enter an amount greater than $0.' }),
	status: z.enum(['pending', 'paid'], {
		invalid_type_error: 'Please select an invoice status.'
	}),
	date: z.string(),
});

const CreateInvoice = InvoiceSchema.omit({ id: true, date: true })
const UpdateInvoice = InvoiceSchema.omit({ date: true });

// This is temporary until @types/react-dom is updated
export type State = {
	errors?: {
		customerId?: string[];
		amount?: string[];
		status?: string[];
	};
	message?: string | null;
};

export async function createInvoice(prevState: State, formData: FormData) {

	const validatedFields = CreateInvoice.safeParse({
		customerId: formData.get('customerId'),
		amount: formData.get('amount'),
		status: formData.get('status'),
	})

	if (!validatedFields.success) {
		return {
			errors: validatedFields.error.flatten().fieldErrors,
			message: 'Missing Fields. Failed to Create Invoice.',
		}
	}

	// Prepare data for insertion into the database
	const { customerId, amount, status } = validatedFields.data;
	const amountInCents = amount * 100
	const date = new Date().toISOString().split('T')[0]

	// Insert data into the database
	try {
		await sql`
			INSERT INTO invoices (customer_id, amount, status, date)
			VAlUES (${customerId}, ${amountInCents}, ${status}, ${date})
			`
	} catch (error) {
		// If a database error occurs, return a more specific error.
		return { message: 'Database Error: Failed to Create Invoice.' }
	}

	// Revalidate the cache for the invoices page and redirect the user.
	revalidatePath('/dashboard/invoices');
	redirect('/dashboard/invoices');
}

export async function updateInvoice(id: string, formData: FormData) {

	const { customerId, amount, status } = UpdateInvoice.parse({
		id,
		customerId: formData.get('customerId'),
		amount: formData.get('amount'),
		status: formData.get('status'),
	});

	const amountInCents = amount * 100;

	try {
		await sql`
			UPDATE invoices
			SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
			WHERE id = ${id}
			`
	} catch (error) {
		return { message: 'Failed to Update Invoice' }
	}

	revalidatePath('/dashboard/invoices');
	redirect('/dashboard/invoices');
}

export async function deleteInvoice(id: string) {
	throw new Error('Not Implemented')

	try {
		await sql`DELETE FROM invoices WHERE id = ${id}`
	} catch (error) {
		return { message: 'Failed to Delete Invoice' }
	}
	revalidatePath('/dashboard/invoices');
}