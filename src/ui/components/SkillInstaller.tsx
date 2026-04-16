/**
 * SkillInstaller.tsx
 * UI component for installing skills from JSON manifest.
 *
 * @version 1.0.0
 */

import { useState } from 'preact/hooks';
import { useInjection } from '../hooks/useInjection';
import { InstallSkillUseCase } from '@application/usecases/InstallSkillUseCase';

export function SkillInstaller({ onClose }: { onClose: () => void }) {
  const installUseCase = useInjection(InstallSkillUseCase);
  const [manifest, setManifest] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInstall = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const result = await installUseCase.execute(manifest);
      if (result.ok) {
        setSuccess(`Skill "${result.value.name}" installed!`);
        setManifest('');
      } else {
        setError(result.error.message);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="modal">
      <h2>Install Skill</h2>
      <textarea
        value={manifest}
        onInput={e => setManifest(e.currentTarget.value)}
        placeholder="Paste skill JSON manifest..."
        rows={10}
        disabled={loading}
      />
      {error && <p class="error">{error}</p>}
      {success && <p class="success">{success}</p>}
      <button onClick={handleInstall} disabled={loading}>
        {loading ? 'Installing...' : 'Install'}
      </button>
      <button onClick={onClose}>Close</button>
    </div>
  );
}
