import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";

export type SectionType = 'work' | 'education' | 'practical' | 'certifications' | 'publications';

interface EmptyStateActionsProps {
  message: string;
  sectionType: SectionType;
  onQuickAdd: (data: any) => void;
}

const EmptyStateActions = ({ message, sectionType, onQuickAdd }: EmptyStateActionsProps) => {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<any>({});

  const handleCancel = () => {
    setShowForm(false);
    setFormData({});
  };

  const handleSubmit = () => {
    // Validate required fields
    const isValid = validateFormData();
    if (!isValid) return;

    onQuickAdd(formData);
    handleCancel();
  };

  const validateFormData = (): boolean => {
    switch (sectionType) {
      case 'work':
        return !!formData.klinik?.trim();
      case 'education':
        return !!formData.universitaet?.trim();
      case 'practical':
        return !!formData.einrichtung?.trim();
      case 'certifications':
        return !!formData.name?.trim();
      case 'publications':
        return !!formData.titel?.trim();
      default:
        return false;
    }
  };

  const renderWorkForm = () => (
    <div className="space-y-3">
      <div>
        <Label htmlFor="klinik">
          Klinik / Einrichtung <span className="text-destructive">*</span>
        </Label>
        <Input
          id="klinik"
          value={formData.klinik || ''}
          onChange={(e) => setFormData({ ...formData, klinik: e.target.value })}
          placeholder="z.B. Charité Berlin"
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="station">Station / Abteilung</Label>
        <Input
          id="station"
          value={formData.station || ''}
          onChange={(e) => setFormData({ ...formData, station: e.target.value })}
          placeholder="z.B. Innere Medizin"
          className="mt-1"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="zeitraum_von">Von</Label>
          <Input
            id="zeitraum_von"
            type="month"
            value={formData.zeitraum_von || ''}
            onChange={(e) => setFormData({ ...formData, zeitraum_von: e.target.value ? `${e.target.value}-01` : null })}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="zeitraum_bis">Bis</Label>
          <Input
            id="zeitraum_bis"
            type="month"
            value={formData.zeitraum_bis?.slice(0, 7) || ''}
            onChange={(e) => setFormData({ ...formData, zeitraum_bis: e.target.value ? `${e.target.value}-01` : null })}
            className="mt-1"
            placeholder="Leer = Heute"
          />
        </div>
      </div>
      <div>
        <Label htmlFor="taetigkeiten">Tätigkeiten</Label>
        <Textarea
          id="taetigkeiten"
          value={formData.taetigkeiten || ''}
          onChange={(e) => setFormData({ ...formData, taetigkeiten: e.target.value })}
          placeholder="Beschreibung der Tätigkeiten"
          rows={2}
          className="mt-1"
        />
      </div>
    </div>
  );

  const renderEducationForm = () => (
    <div className="space-y-3">
      <div>
        <Label htmlFor="universitaet">
          Universität / Hochschule <span className="text-destructive">*</span>
        </Label>
        <Input
          id="universitaet"
          value={formData.universitaet || ''}
          onChange={(e) => setFormData({ ...formData, universitaet: e.target.value })}
          placeholder="z.B. Humboldt-Universität Berlin"
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="abschluss">Abschluss</Label>
        <Input
          id="abschluss"
          value={formData.abschluss || ''}
          onChange={(e) => setFormData({ ...formData, abschluss: e.target.value })}
          placeholder="z.B. Staatsexamen Medizin"
          className="mt-1"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="edu_von">Von</Label>
          <Input
            id="edu_von"
            type="month"
            value={formData.zeitraum_von?.slice(0, 7) || ''}
            onChange={(e) => setFormData({ ...formData, zeitraum_von: e.target.value ? `${e.target.value}-01` : null })}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="edu_bis">Bis</Label>
          <Input
            id="edu_bis"
            type="month"
            value={formData.zeitraum_bis?.slice(0, 7) || ''}
            onChange={(e) => setFormData({ ...formData, zeitraum_bis: e.target.value ? `${e.target.value}-01` : null })}
            className="mt-1"
          />
        </div>
      </div>
      <div>
        <Label htmlFor="abschlussarbeit">Abschlussarbeit</Label>
        <Textarea
          id="abschlussarbeit"
          value={formData.abschlussarbeit || ''}
          onChange={(e) => setFormData({ ...formData, abschlussarbeit: e.target.value })}
          placeholder="Titel der Abschlussarbeit"
          rows={2}
          className="mt-1"
        />
      </div>
    </div>
  );

  const renderPracticalForm = () => (
    <div className="space-y-3">
      <div>
        <Label htmlFor="einrichtung">
          Einrichtung <span className="text-destructive">*</span>
        </Label>
        <Input
          id="einrichtung"
          value={formData.einrichtung || ''}
          onChange={(e) => setFormData({ ...formData, einrichtung: e.target.value })}
          placeholder="z.B. Universitätsklinikum"
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="fachbereich">Fachbereich</Label>
        <Input
          id="fachbereich"
          value={formData.fachbereich || ''}
          onChange={(e) => setFormData({ ...formData, fachbereich: e.target.value })}
          placeholder="z.B. Chirurgie"
          className="mt-1"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="prac_von">Von</Label>
          <Input
            id="prac_von"
            type="month"
            value={formData.zeitraum_von?.slice(0, 7) || ''}
            onChange={(e) => setFormData({ ...formData, zeitraum_von: e.target.value ? `${e.target.value}-01` : null })}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="prac_bis">Bis</Label>
          <Input
            id="prac_bis"
            type="month"
            value={formData.zeitraum_bis?.slice(0, 7) || ''}
            onChange={(e) => setFormData({ ...formData, zeitraum_bis: e.target.value ? `${e.target.value}-01` : null })}
            className="mt-1"
          />
        </div>
      </div>
      <div>
        <Label htmlFor="beschreibung">Beschreibung</Label>
        <Textarea
          id="beschreibung"
          value={formData.beschreibung || ''}
          onChange={(e) => setFormData({ ...formData, beschreibung: e.target.value })}
          placeholder="Tätigkeitsbeschreibung"
          rows={2}
          className="mt-1"
        />
      </div>
    </div>
  );

  const renderCertificationsForm = () => (
    <div className="space-y-3">
      <div>
        <Label htmlFor="cert_name">
          Zertifikat / Titel <span className="text-destructive">*</span>
        </Label>
        <Input
          id="cert_name"
          value={formData.name || ''}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="z.B. Fachkunde Strahlenschutz"
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="aussteller">Aussteller</Label>
        <Input
          id="aussteller"
          value={formData.aussteller || ''}
          onChange={(e) => setFormData({ ...formData, aussteller: e.target.value })}
          placeholder="z.B. Ärztekammer"
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="datum">Datum</Label>
        <Input
          id="datum"
          type="month"
          value={formData.datum?.slice(0, 7) || ''}
          onChange={(e) => setFormData({ ...formData, datum: e.target.value ? `${e.target.value}-01` : null })}
          className="mt-1"
        />
      </div>
    </div>
  );

  const renderPublicationsForm = () => (
    <div className="space-y-3">
      <div>
        <Label htmlFor="titel">
          Titel <span className="text-destructive">*</span>
        </Label>
        <Input
          id="titel"
          value={formData.titel || ''}
          onChange={(e) => setFormData({ ...formData, titel: e.target.value })}
          placeholder="Titel der Publikation"
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="journal_ort">Journal / Ort</Label>
        <Input
          id="journal_ort"
          value={formData.journal_ort || ''}
          onChange={(e) => setFormData({ ...formData, journal_ort: e.target.value })}
          placeholder="z.B. The Lancet"
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="pub_datum">Datum</Label>
        <Input
          id="pub_datum"
          type="month"
          value={formData.datum?.slice(0, 7) || ''}
          onChange={(e) => setFormData({ ...formData, datum: e.target.value ? `${e.target.value}-01` : null })}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="pub_beschreibung">Beschreibung</Label>
        <Textarea
          id="pub_beschreibung"
          value={formData.beschreibung || ''}
          onChange={(e) => setFormData({ ...formData, beschreibung: e.target.value })}
          placeholder="Kurze Beschreibung"
          rows={2}
          className="mt-1"
        />
      </div>
    </div>
  );

  const renderForm = () => {
    switch (sectionType) {
      case 'work':
        return renderWorkForm();
      case 'education':
        return renderEducationForm();
      case 'practical':
        return renderPracticalForm();
      case 'certifications':
        return renderCertificationsForm();
      case 'publications':
        return renderPublicationsForm();
      default:
        return null;
    }
  };

  return (
    <div className="py-4">
      <p className="text-muted-foreground text-center mb-4">{message}</p>

      {!showForm ? (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowForm(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Schnell hinzufügen
          </Button>
        </div>
      ) : (
        <div className="bg-muted/50 rounded-lg p-4 space-y-4 border border-border">
          {renderForm()}

          <div className="flex gap-2 justify-end pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Abbrechen
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!validateFormData()}
            >
              Hinzufügen
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmptyStateActions;
