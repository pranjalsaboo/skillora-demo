import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowLeft, ArrowUp, ChevronLeft, ChevronRight, Plus, Trash2, Upload } from "lucide-react";
import { AdminCard, AdminShell, StatusBadge, useStaffRole } from "@/components/admin/AdminShell";
import { CardView } from "@/components/CardView";
import { QuestionView } from "@/components/QuestionView";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { LessonCard, Question } from "@/data/types";
import { uploadLessonMedia } from "@/lib/admin.functions";
import { selectCls } from "@/lib/admin-utils";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/lessons/$lessonId")({
  component: LessonEditor,
});

type Item<T> = { id: string; data: T };
type Details = {
  title: string;
  unit_id: string;
  minutes: number;
  summary: string;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
};

async function load(id: string) {
  const [l, u, c, q] = await Promise.all([
    supabase.from("lessons").select("*").eq("id", id).maybeSingle(),
    supabase.from("units").select("id,title").order("position"),
    supabase.from("lesson_cards").select("id,data").eq("lesson_id", id).order("position"),
    supabase.from("lesson_questions").select("id,data").eq("lesson_id", id).order("position"),
  ]);
  if (l.error) throw l.error;
  return {
    lesson: l.data,
    units: u.data ?? [],
    cards: (c.data ?? []).map((x) => ({ id: x.id, data: x.data as unknown as LessonCard })),
    questions: (q.data ?? []).map((x) => ({ id: x.id, data: x.data as unknown as Question })),
  };
}

const NEW_CARD: Record<LessonCard["type"], LessonCard> = {
  text: { type: "text", title: "", body: "" },
  image: { type: "image", title: "", src: "", caption: "" },
  audio: { type: "audio", title: "", durationLabel: "1 min", transcript: "" },
  video: { type: "video", title: "", poster: "", steps: [] },
};
const NEW_QUESTION: Record<Question["type"], Question> = {
  choice: { type: "choice", prompt: "", options: ["", ""], answerIndex: 0, explanation: "" },
  boolean: { type: "boolean", prompt: "", answer: true, explanation: "" },
  order: { type: "order", prompt: "", steps: ["", ""], explanation: "" },
};
const TYPE_LABEL: Record<string, string> = {
  text: "Text",
  image: "Image",
  audio: "Audio",
  video: "Video",
  choice: "Multiple choice",
  boolean: "True / False",
  order: "Put in order",
};

function LessonEditor() {
  const { lessonId } = Route.useParams();
  const role = useStaffRole();
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["admin", "lesson", lessonId], queryFn: () => load(lessonId) });
  const [details, setDetails] = useState<Details | null>(null);
  const [cards, setCards] = useState<Item<LessonCard>[]>([]);
  const [questions, setQuestions] = useState<Item<Question>[]>([]);
  const [removed, setRemoved] = useState<{ cards: string[]; questions: string[] }>({ cards: [], questions: [] });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!query.data?.lesson) return;
    const l = query.data.lesson;
    setDetails({
      title: l.title,
      unit_id: l.unit_id,
      minutes: l.minutes,
      summary: l.summary,
      status: l.status,
      reviewed_by: l.reviewed_by,
      reviewed_at: l.reviewed_at,
    });
    setCards(query.data.cards);
    setQuestions(query.data.questions);
    setRemoved({ cards: [], questions: [] });
    setDirty(false);
  }, [query.data]);

  if (query.isLoading || (query.data?.lesson && !details))
    return (
      <AdminShell title="Loading…">
        <p className="text-muted-foreground">Loading lesson…</p>
      </AdminShell>
    );
  if (!query.data?.lesson || !details)
    return (
      <AdminShell title="Lesson not found">
        <Link to="/admin/lessons" className="text-primary">
          Back to lessons
        </Link>
      </AdminShell>
    );

  const patch = (p: Partial<Details>) => {
    setDetails({ ...details, ...p });
    setDirty(true);
  };

  async function save() {
    if (!details) return;
    if (details.status === "published" && questions.length === 0) {
      toast.error("Add at least one question before publishing.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("lessons")
        .update({ ...details, minutes: Math.max(1, details.minutes || 1) })
        .eq("id", lessonId);
      if (error) throw error;
      if (removed.cards.length) await supabase.from("lesson_cards").delete().in("id", removed.cards);
      if (removed.questions.length) await supabase.from("lesson_questions").delete().in("id", removed.questions);
      if (cards.length) {
        const r = await supabase.from("lesson_cards").upsert(
          cards.map((c, i) => ({ id: c.id, lesson_id: lessonId, position: i, data: c.data as never })),
        );
        if (r.error) throw r.error;
      }
      if (questions.length) {
        const r = await supabase.from("lesson_questions").upsert(
          questions.map((q, i) => {
            const { id: _drop, ...raw } = q.data;
            const data = raw.type === "order" ? { ...raw, steps: clean(raw.steps) } : raw;
            return { id: q.id, lesson_id: lessonId, position: i, data: data as never };
          }),
        );
        if (r.error) throw r.error;
      }
      toast.success("Lesson saved");
      await qc.invalidateQueries({ queryKey: ["admin"] });
    } catch (e) {
      toast.error(e instanceof Error && /publish/i.test(e.message) ? "Only admins can publish." : "Couldn't save lesson.");
    } finally {
      setSaving(false);
    }
  }

  const setCardsD = (v: Item<LessonCard>[]) => {
    setCards(v);
    setDirty(true);
  };
  const setQuestionsD = (v: Item<Question>[]) => {
    setQuestions(v);
    setDirty(true);
  };

  return (
    <AdminShell
      title={details.title || "Untitled lesson"}
      subtitle={query.data.units.find((u) => u.id === details.unit_id)?.title}
      actions={
        <>
          <Link to="/admin/lessons" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> All lessons
          </Link>
          <StatusBadge status={details.status} />
          <Button onClick={save} disabled={saving || !dirty}>
            {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-[1fr_360px] gap-6">
        <div className="min-w-0 space-y-6">
          <AdminCard>
            <h2 className="mb-4 font-bold">Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Title" className="col-span-2">
                <Input value={details.title} onChange={(e) => patch({ title: e.target.value })} />
              </Field>
              <Field label="Unit">
                <select className={selectCls + " w-full"} value={details.unit_id} onChange={(e) => patch({ unit_id: e.target.value })}>
                  {query.data.units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.title}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Minutes">
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={details.minutes}
                  onChange={(e) => patch({ minutes: Number(e.target.value) })}
                />
              </Field>
              <Field label="Summary" className="col-span-2">
                <Textarea rows={2} value={details.summary} onChange={(e) => patch({ summary: e.target.value })} />
              </Field>
              <Field label="Status">
                <select className={selectCls + " w-full"} value={details.status} onChange={(e) => patch({ status: e.target.value })}>
                  <option value="draft">Draft</option>
                  <option value="review">In review</option>
                  <option value="published" disabled={role !== "admin"}>
                    Published{role !== "admin" ? " (admins only)" : ""}
                  </option>
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Reviewed by">
                  <Input
                    placeholder="e.g. Clinical lead"
                    value={details.reviewed_by ?? ""}
                    onChange={(e) => patch({ reviewed_by: e.target.value || null })}
                  />
                </Field>
                <Field label="Review date">
                  <Input
                    type="date"
                    value={details.reviewed_at ?? ""}
                    onChange={(e) => patch({ reviewed_at: e.target.value || null })}
                  />
                </Field>
              </div>
            </div>
          </AdminCard>

          <Tabs defaultValue="cards">
            <TabsList>
              <TabsTrigger value="cards">Cards ({cards.length})</TabsTrigger>
              <TabsTrigger value="questions">Questions ({questions.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="cards" className="space-y-3">
              <ItemList
                items={cards}
                onChange={setCardsD}
                onRemove={(id) => setRemoved((r) => ({ ...r, cards: [...r.cards, id] }))}
                render={(c, set) => <CardEditor card={c} onChange={set} />}
                label={(c) => c.title}
              />
              <AddRow
                types={Object.keys(NEW_CARD) as LessonCard["type"][]}
                onAdd={(t) => setCardsD([...cards, { id: crypto.randomUUID(), data: structuredClone(NEW_CARD[t]) }])}
              />
            </TabsContent>
            <TabsContent value="questions" className="space-y-3">
              <ItemList
                items={questions}
                onChange={setQuestionsD}
                onRemove={(id) => setRemoved((r) => ({ ...r, questions: [...r.questions, id] }))}
                render={(q, set) => <QuestionEditor question={q} onChange={set} />}
                label={(q) => q.prompt}
              />
              <AddRow
                types={Object.keys(NEW_QUESTION) as Question["type"][]}
                onAdd={(t) =>
                  setQuestionsD([...questions, { id: crypto.randomUUID(), data: structuredClone(NEW_QUESTION[t]) }])
                }
              />
            </TabsContent>
          </Tabs>
        </div>

        <div className="sticky top-24 self-start">
          <Preview cards={cards.map((c) => c.data)} questions={questions.map((q) => q.data)} />
        </div>
      </div>
    </AdminShell>
  );
}

function Field({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function ItemList<T extends { type: string }>({
  items,
  onChange,
  onRemove,
  render,
  label,
}: {
  items: Item<T>[];
  onChange: (v: Item<T>[]) => void;
  onRemove: (id: string) => void;
  render: (data: T, set: (d: T) => void) => ReactNode;
  label: (d: T) => string;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const move = (i: number, d: -1 | 1) => {
    const next = [...items];
    const a = next[i];
    const b = next[i + d];
    if (!a || !b) return;
    next[i] = b;
    next[i + d] = a;
    onChange(next);
  };
  if (items.length === 0) return <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Nothing here yet.</p>;
  return (
    <>
      {items.map((it, i) => (
        <AdminCard key={it.id} className="p-0">
          <div className="flex items-center gap-2 px-4 py-3">
            <span className="w-6 text-xs font-bold text-muted-foreground tabular-nums">{i + 1}</span>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-primary">{TYPE_LABEL[it.data.type]}</span>
            <button className="min-w-0 flex-1 truncate text-left text-sm font-medium" onClick={() => setOpen(open === it.id ? null : it.id)}>
              {label(it.data) || <span className="text-muted-foreground">Untitled — click to edit</span>}
            </button>
            <Button size="icon" variant="ghost" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">
              <ArrowUp />
            </Button>
            <Button size="icon" variant="ghost" disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label="Move down">
              <ArrowDown />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Delete"
              onClick={() => {
                onRemove(it.id);
                onChange(items.filter((x) => x.id !== it.id));
              }}
            >
              <Trash2 />
            </Button>
          </div>
          {open === it.id && (
            <div className="border-t border-border p-4">
              {render(it.data, (d) => onChange(items.map((x) => (x.id === it.id ? { ...x, data: d } : x))))}
            </div>
          )}
        </AdminCard>
      ))}
    </>
  );
}

function AddRow<T extends string>({ types, onAdd }: { types: T[]; onAdd: (t: T) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {types.map((t) => (
        <Button key={t} size="sm" variant="outline" onClick={() => onAdd(t)}>
          <Plus /> {TYPE_LABEL[t]}
        </Button>
      ))}
    </div>
  );
}

const lines = (s: string) => s.split("\n");
const clean = (a: string[]) => a.map((x) => x.trim()).filter(Boolean);

function MediaInput({ value, onChange, accept }: { value: string; onChange: (v: string) => void; accept: string }) {
  const [busy, setBusy] = useState(false);
  async function pick(file: File) {
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Files must be under 8 MB");
      return;
    }
    setBusy(true);
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      let bin = "";
      for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
      const { url } = await uploadLessonMedia({ data: { name: file.name, type: file.type, base64: btoa(bin) } });
      onChange(url);
      toast.success("Uploaded");
    } catch {
      toast.error("Upload failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex gap-2">
      <Input placeholder="Paste a link or upload" value={value} onChange={(e) => onChange(e.target.value)} />
      <Button asChild variant="outline" disabled={busy}>
        <label className="cursor-pointer">
          <Upload /> {busy ? "Uploading…" : "Upload"}
          <input type="file" accept={accept} className="hidden" onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])} />
        </label>
      </Button>
    </div>
  );
}

function CardEditor({ card, onChange }: { card: LessonCard; onChange: (c: LessonCard) => void }) {
  const title = (
    <Field label="Title">
      <Input value={card.title} onChange={(e) => onChange({ ...card, title: e.target.value })} />
    </Field>
  );
  switch (card.type) {
    case "text":
      return (
        <div className="space-y-3">
          {title}
          <Field label="Body">
            <Textarea rows={4} value={card.body} onChange={(e) => onChange({ ...card, body: e.target.value })} />
          </Field>
          <Field label="Key points (one per line, optional)">
            <Textarea
              rows={3}
              value={(card.bullets ?? []).join("\n")}
              onChange={(e) => {
                const b = lines(e.target.value);
                const { bullets: _b, ...rest } = card;
                onChange(b.some((x) => x.trim()) ? { ...rest, bullets: b } : rest);
              }}
            />
          </Field>
        </div>
      );
    case "image":
      return (
        <div className="space-y-3">
          {title}
          <Field label="Image">
            <MediaInput accept="image/*" value={card.src} onChange={(src) => onChange({ ...card, src })} />
          </Field>
          <Field label="Caption">
            <Textarea rows={2} value={card.caption} onChange={(e) => onChange({ ...card, caption: e.target.value })} />
          </Field>
        </div>
      );
    case "audio":
      return (
        <div className="space-y-3">
          {title}
          <Field label="Audio file (optional — without it the transcript is read aloud)">
            <MediaInput
              accept="audio/*"
              value={card.src ?? ""}
              onChange={(src) => {
                const { src: _s, ...rest } = card;
                onChange(src ? { ...rest, src } : rest);
              }}
            />
          </Field>
          <Field label="Length label">
            <Input value={card.durationLabel} onChange={(e) => onChange({ ...card, durationLabel: e.target.value })} />
          </Field>
          <Field label="Transcript">
            <Textarea rows={4} value={card.transcript} onChange={(e) => onChange({ ...card, transcript: e.target.value })} />
          </Field>
        </div>
      );
    case "video":
      return (
        <div className="space-y-3">
          {title}
          <Field label="Video file (optional — without it the steps play instead)">
            <MediaInput
              accept="video/*"
              value={card.src ?? ""}
              onChange={(src) => {
                const { src: _s, ...rest } = card;
                onChange(src ? { ...rest, src } : rest);
              }}
            />
          </Field>
          <Field label="Cover image">
            <MediaInput accept="image/*" value={card.poster} onChange={(poster) => onChange({ ...card, poster })} />
          </Field>
          <Field label="Steps — one per line as “0:10 | What happens”">
            <Textarea
              rows={4}
              value={card.steps.map((s) => `${s.at} | ${s.text}`).join("\n")}
              onChange={(e) =>
                onChange({
                  ...card,
                  steps: lines(e.target.value).map((l) => {
                    const [at = "", ...t] = l.split("|");
                    return { at: at.trim(), text: t.join("|").trim() };
                  }),
                })
              }
            />
          </Field>
        </div>
      );
  }
}

function QuestionEditor({ question, onChange }: { question: Question; onChange: (q: Question) => void }) {
  const common = (
    <Field label="Question">
      <Textarea rows={2} value={question.prompt} onChange={(e) => onChange({ ...question, prompt: e.target.value })} />
    </Field>
  );
  const explanation = (
    <Field label="Explanation (shown after answering)">
      <Textarea rows={2} value={question.explanation} onChange={(e) => onChange({ ...question, explanation: e.target.value })} />
    </Field>
  );
  if (question.type === "choice")
    return (
      <div className="space-y-3">
        {common}
        <Field label="Options — tick the correct one">
          <div className="space-y-2">
            {question.options.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={question.answerIndex === i}
                  onChange={() => onChange({ ...question, answerIndex: i })}
                  className="accent-[var(--color-primary)]"
                  aria-label={`Option ${i + 1} is correct`}
                />
                <Input
                  value={o}
                  onChange={(e) => onChange({ ...question, options: question.options.map((x, j) => (j === i ? e.target.value : x)) })}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={question.options.length <= 2}
                  aria-label="Remove option"
                  onClick={() =>
                    onChange({
                      ...question,
                      options: question.options.filter((_, j) => j !== i),
                      answerIndex: Math.max(0, question.answerIndex > i ? question.answerIndex - 1 : question.answerIndex === i ? 0 : question.answerIndex),
                    })
                  }
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
            {question.options.length < 5 && (
              <Button size="sm" variant="outline" onClick={() => onChange({ ...question, options: [...question.options, ""] })}>
                <Plus /> Option
              </Button>
            )}
          </div>
        </Field>
        {explanation}
      </div>
    );
  if (question.type === "boolean")
    return (
      <div className="space-y-3">
        {common}
        <Field label="Correct answer">
          <select
            className={selectCls}
            value={question.answer ? "true" : "false"}
            onChange={(e) => onChange({ ...question, answer: e.target.value === "true" })}
          >
            <option value="true">True</option>
            <option value="false">False</option>
          </select>
        </Field>
        {explanation}
      </div>
    );
  return (
    <div className="space-y-3">
      {common}
      <Field label="Steps in the correct order (one per line — nurses see them shuffled)">
        <Textarea rows={4} value={question.steps.join("\n")} onChange={(e) => onChange({ ...question, steps: lines(e.target.value) })} />
      </Field>
      {explanation}
    </div>
  );
}

function Preview({ cards, questions }: { cards: LessonCard[]; questions: Question[] }) {
  const steps = [
    ...cards.map((c) => ({ kind: "card" as const, c })),
    ...questions.map((q) => ({
      kind: "q" as const,
      q: q.type === "order" ? { ...q, steps: clean(q.steps) } : q.type === "choice" ? { ...q, options: q.options } : q,
    })),
  ];
  const [i, setI] = useState(0);
  const [answered, setAnswered] = useState(false);
  const idx = Math.min(i, Math.max(0, steps.length - 1));
  const step = steps[idx];
  const go = (d: number) => {
    setI(Math.max(0, Math.min(steps.length - 1, idx + d)));
    setAnswered(false);
  };
  return (
    <div>
      <p className="mb-2 text-center text-xs font-semibold text-muted-foreground">Nurse preview</p>
      <div className="mx-auto h-[640px] w-[340px] overflow-hidden rounded-[2.5rem] border-[10px] border-foreground/90 bg-background shadow-xl">
        <div className="h-full overflow-y-auto p-4">
          <div className="mb-4 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary transition-all" style={{ width: `${steps.length ? ((idx + 1) / steps.length) * 100 : 0}%` }} />
          </div>
          {!step && <p className="pt-20 text-center text-sm text-muted-foreground">Add cards or questions to preview.</p>}
          {step?.kind === "card" && <CardView key={idx} card={step.c} />}
          {step?.kind === "q" && (
            <QuestionView key={idx} question={step.q} index={idx} answered={answered} onAnswer={() => setAnswered(true)} />
          )}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-center gap-3">
        <Button size="icon" variant="outline" onClick={() => go(-1)} disabled={idx === 0} aria-label="Previous">
          <ChevronLeft />
        </Button>
        <span className="text-xs tabular-nums text-muted-foreground">
          {steps.length ? idx + 1 : 0} / {steps.length}
        </span>
        <Button size="icon" variant="outline" onClick={() => go(1)} disabled={idx >= steps.length - 1} aria-label="Next">
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
