'use client';
import { Maximize2 } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from './ui';
import { NativePlot } from './charts';
export function Plot({ kind, caption, number }) {
    return (<figure className="article-figure" aria-label={caption}>
      <NativePlot kind={kind}/>
      <Dialog>
        <figcaption><span className="figure-number">Fig. {String(number).padStart(2, '0')}</span>{caption}
          <DialogTrigger className="expand-chart" aria-label={`Enlarge figure ${number}: ${caption}`} title="Enlarge chart"><Maximize2 size={16} aria-hidden="true"/></DialogTrigger>
        </figcaption>
        <DialogContent className="figure-dialog" aria-describedby={undefined}>
          <DialogTitle className="figure-dialog-title">{caption}</DialogTitle>
          <div className="figure-scroll"><NativePlot kind={kind} expanded/></div>
        </DialogContent>
      </Dialog>
    </figure>);
}
