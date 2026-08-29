"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { Boton } from "@/components/ui/boton";

/**
 * Deja la convocatoria en el portapapeles para pegarla en el grupo de WhatsApp.
 *
 * El club se organiza por ahí y el sistema no manda correos, así que la
 * notificación interna por sí sola no convoca a nadie: hay que entrar al panel
 * para verla. Esto usa el canal por el que la gente realmente se habla.
 */
export function CopiarConvocatoria({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // Sin permiso de portapapeles queda el texto a la vista para copiarlo a mano.
      setCopiado(false);
    }
  }

  return (
    <div className="space-y-3">
      <pre className="max-h-64 overflow-auto rounded-lg border border-stone-200 bg-stone-50 p-4 text-sm whitespace-pre-wrap text-stone-700">
        {texto}
      </pre>

      <Boton type="button" variante="outline" onClick={copiar}>
        {copiado ? <Check aria-hidden /> : <Copy aria-hidden />}
        {copiado ? "Copiado" : "Copiar para WhatsApp"}
      </Boton>
    </div>
  );
}
