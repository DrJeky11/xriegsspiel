/** Editorial presentation data only; independent of rules and saved exercises. */
export interface ReferenceSource { label:string; url:string; locator:string; dated:string; accessed:string }
export interface ReferenceAsset { path:string; width:number; height:number; bytes:number; sha256:string }
export interface UnitReference {
  equipmentId:string; title:string; roleLabel:string; role:string; recognition:string[];
  reviewStatus:'reviewed'; reviewed:string; sources:ReferenceSource[];
  media:{ id:string; subject:string; relationship:'exact variant'|'class example'; photoDate:string;
    caveat:string; sourcePage:string; originalUrl:string; creator:string; credit:string;
    license:string; licenseUrl:string; rightsEvidence:string; attribution:string;
    sourceAssetUrl:string; sourceSha256:string; alt:string; framing:string; thumbnail:ReferenceAsset; detail:ReferenceAsset };
}
export interface ReferenceManifest { version:string; notice:string; records:UnitReference[] }
