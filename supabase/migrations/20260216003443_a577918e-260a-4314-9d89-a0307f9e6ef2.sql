
-- Allow anon users to read/write clients (staff auth is handled via PIN at app level)
CREATE POLICY "Allow anon insert clients"
ON public.clients FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Allow anon select clients"
ON public.clients FOR SELECT
TO anon
USING (true);

CREATE POLICY "Allow anon update clients"
ON public.clients FOR UPDATE
TO anon
USING (true);

-- Allow anon to manage staff_goals
CREATE POLICY "Allow anon insert staff_goals"
ON public.staff_goals FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Allow anon select staff_goals"
ON public.staff_goals FOR SELECT
TO anon
USING (true);

CREATE POLICY "Allow anon update staff_goals"
ON public.staff_goals FOR UPDATE
TO anon
USING (true);

-- Allow anon to manage time_clock
CREATE POLICY "Allow anon insert time_clock"
ON public.time_clock FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Allow anon select time_clock"
ON public.time_clock FOR SELECT
TO anon
USING (true);

CREATE POLICY "Allow anon update time_clock"
ON public.time_clock FOR UPDATE
TO anon
USING (true);

-- Allow anon to manage appointments
CREATE POLICY "Allow anon all appointments"
ON public.appointments FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- Allow anon to manage transactions
CREATE POLICY "Allow anon all transactions"
ON public.transactions FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- Allow anon to read staff
CREATE POLICY "Allow anon select staff"
ON public.staff FOR SELECT
TO anon
USING (true);

-- Allow anon to read services
CREATE POLICY "Allow anon select services"
ON public.services FOR SELECT
TO anon
USING (true);

-- Allow anon to read rooms
CREATE POLICY "Allow anon select rooms"
ON public.rooms FOR SELECT
TO anon
USING (true);

-- Allow anon to read machines
CREATE POLICY "Allow anon select machines"
ON public.machines FOR SELECT
TO anon
USING (true);

-- Allow anon to manage receipts
CREATE POLICY "Allow anon all receipts"
ON public.receipts FOR ALL
TO anon
USING (true)
WITH CHECK (true);
