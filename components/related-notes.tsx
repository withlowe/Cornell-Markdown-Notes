"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getRelatedDocuments } from "@/lib/link-utils"
import type { DocumentData } from "@/lib/storage-utils"
import { ExternalLink } from "lucide-react"

interface RelatedNotesProps {
  document: DocumentData
  onNoteClick: (document: DocumentData) => void
}

export function RelatedNotes({ document, onNoteClick }: RelatedNotesProps) {
  const { forwardLinks, backlinks } = getRelatedDocuments(document)

  if (forwardLinks.length === 0 && backlinks.length === 0) {
    return null
  }

  return (
    <div className="space-y-6">
      {forwardLinks.length > 0 && (
        <Card className="card-standard">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">Linked Notes ({forwardLinks.length})</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-1">
              {forwardLinks.map((linkedDoc) => (
                <div
                  key={linkedDoc.id}
                  className="flex items-center justify-between py-2 px-1 hover:bg-accent/50 cursor-pointer transition-colors rounded-sm group"
                  onClick={() => onNoteClick(linkedDoc)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-base flex items-center gap-2">
                      {linkedDoc.title}
                      <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    {linkedDoc.summary && (
                      <p className="text-base text-muted-foreground line-clamp-1 mt-0.5 leading-relaxed">
                        {linkedDoc.summary}
                      </p>
                    )}
                  </div>
                  {linkedDoc.tags.length > 0 && (
                    <div className="flex gap-1 ml-2">
                      {linkedDoc.tags.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs uppercase px-1.5 py-0.5">
                          {tag}
                        </Badge>
                      ))}
                      {linkedDoc.tags.length > 2 && (
                        <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                          +{linkedDoc.tags.length - 2}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {backlinks.length > 0 && (
        <Card className="card-standard">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">Backlinks ({backlinks.length})</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-1">
              {backlinks.map((backlinkDoc) => (
                <div
                  key={backlinkDoc.id}
                  className="flex items-center justify-between py-2 px-1 hover:bg-accent/50 cursor-pointer transition-colors rounded-sm group"
                  onClick={() => onNoteClick(backlinkDoc)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-base flex items-center gap-2">
                      {backlinkDoc.title}
                      <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    {backlinkDoc.summary && (
                      <p className="text-base text-muted-foreground line-clamp-1 mt-0.5 leading-relaxed">
                        {backlinkDoc.summary}
                      </p>
                    )}
                  </div>
                  {backlinkDoc.tags.length > 0 && (
                    <div className="flex gap-1 ml-2">
                      {backlinkDoc.tags.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs uppercase px-1.5 py-0.5">
                          {tag}
                        </Badge>
                      ))}
                      {backlinkDoc.tags.length > 2 && (
                        <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                          +{backlinkDoc.tags.length - 2}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
