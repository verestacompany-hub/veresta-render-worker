import React from "react";
import { Composition } from "remotion";
import { VerestaShort, type VerestaShortProps } from "./VerestaShort";

const defaults: VerestaShortProps = {
  brand: "Hidden History",
  title: "The Olympic Marathon Where the Winner Was Given Poison",
  accent: "#c9aa70",
  template: "Archive Noir",
  visualPace: "Balanced",
  captionStyle: "archive",
  subtitles: [],
  scenes: [
    { start:0, end:10, image:"", caption:"THE STRANGEST MARATHON IN OLYMPIC HISTORY" },
    { start:10, end:20, image:"", caption:"DUST. HEAT. AND ALMOST NO WATER." },
  ],
};

export const VerestaRoot: React.FC = () => <Composition id="VerestaShort" component={VerestaShort} durationInFrames={1800} fps={30} width={1080} height={1920} defaultProps={defaults} />;
